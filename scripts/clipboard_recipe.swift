// PDG-LARGE-FILE-JUSTIFICATION: One private transaction CLI keeps exact backup, guarded synthetic capture and verified restoration under the same representation and ownership rules.
import AppKit
import Foundation
import CryptoKit
import Darwin

struct Failure: Error { let code: String }
struct Flavor: Codable { let name: String; let data: Data }
struct Item: Codable { let flavors: [Flavor] }
struct Backup: Codable { let schema: Int; let nonce: String; let changeCount: Int; let items: [Item] }
struct Snapshot { let changeCount: Int; let items: [Item] }

func digest(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}
func framed(_ items: [Item]) -> Data {
    var result = Data()
    func append(_ data: Data) {
        var length = UInt64(data.count).bigEndian
        Swift.withUnsafeBytes(of: &length) { result.append(contentsOf: $0) }
        result.append(data)
    }
    append(Data(String(items.count).utf8))
    for item in items {
        append(Data(String(item.flavors.count).utf8))
        for flavor in item.flavors.sorted(by: { $0.name < $1.name }) {
            append(Data(flavor.name.utf8)); append(flavor.data)
        }
    }
    return result
}
func metadata(_ snapshot: Snapshot) -> [String: Any] {
    ["change_count": snapshot.changeCount, "item_count": snapshot.items.count,
     "flavor_count": snapshot.items.reduce(0) { $0 + $1.flavors.count },
     "digest": digest(framed(snapshot.items))]
}
func writeExclusive(_ data: Data, _ filename: String) throws {
    let fd = Darwin.open(filename, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, mode_t(0o600))
    guard fd >= 0 else { throw Failure(code: "EXCLUSIVE_FILE_CREATE_REFUSED") }
    defer { Darwin.close(fd) }
    var created = stat()
    guard fstat(fd, &created) == 0 else { throw Failure(code: "CREATED_FILE_IDENTITY_UNAVAILABLE") }
    do {
        guard fchmod(fd, mode_t(0o600)) == 0 else { throw Failure(code: "PRIVATE_PERMISSIONS_REFUSED") }
        try data.withUnsafeBytes { bytes in
            var written = 0
            while written < bytes.count {
                let amount = Darwin.write(fd, bytes.baseAddress!.advanced(by: written), bytes.count - written)
                if amount < 0 && errno == EINTR { continue }
                guard amount > 0 else { throw Failure(code: "FILE_WRITE_FAILED") }
                written += amount
            }
        }
        guard fsync(fd) == 0 else { throw Failure(code: "FILE_SYNC_FAILED") }
    } catch {
        // Only this exclusive creation is ours; never remove a pre-existing path.
        var observed = stat()
        if lstat(filename, &observed) == 0 && observed.st_dev == created.st_dev && observed.st_ino == created.st_ino {
            Darwin.unlink(filename)
        }
        throw error
    }
}
func privateBackup(_ filename: String, _ nonce: String) throws -> (Backup, stat) {
    let fd = Darwin.open(filename, O_RDONLY | O_NOFOLLOW)
    guard fd >= 0 else { throw Failure(code: "PRIVATE_BACKUP_OPEN_REFUSED") }
    defer { Darwin.close(fd) }
    var identity = stat()
    guard fstat(fd, &identity) == 0, identity.st_uid == geteuid(),
          identity.st_mode & mode_t(S_IFMT) == mode_t(S_IFREG),
          identity.st_mode & 0o777 == 0o600, identity.st_nlink == 1 else {
        throw Failure(code: "PRIVATE_BACKUP_IDENTITY_REFUSED")
    }
    let handle = FileHandle(fileDescriptor: fd, closeOnDealloc: false)
    let bytes = try handle.readToEnd() ?? Data()
    let backup = try PropertyListDecoder().decode(Backup.self, from: bytes)
    guard backup.schema == 1, backup.nonce == nonce else { throw Failure(code: "PRIVATE_BACKUP_NONCE_MISMATCH") }
    return (backup, identity)
}

final class ClipboardRecipe {
    var ownedReceipt: [String: Any]?
    // NSPasteboard has no compare-and-swap: a foreign writer can still race the final count check and clearContents.
    func clearIfUnchanged(_ observed: Snapshot) throws {
        let pb = NSPasteboard.general
        guard pb.changeCount == observed.changeCount else { throw Failure(code: "CLIPBOARD_CHANGED_BEFORE_MUTATION") }
        let count = pb.clearContents()
        ownedReceipt = ["digest": digest(framed([])), "change_count": count]
    }
    func snapshot() throws -> Snapshot {
        let pb = NSPasteboard.general, before = pb.changeCount
        let items = try (pb.pasteboardItems ?? []).map { item in
            Item(flavors: try item.types.map { type in
                guard let bytes = item.data(forType: type) else { throw Failure(code: "FLAVOR_DATA_UNAVAILABLE") }
                return Flavor(name: type.rawValue, data: bytes)
            })
        }
        guard pb.changeCount == before else { throw Failure(code: "CLIPBOARD_CHANGED_DURING_READ") }
        return Snapshot(changeCount: before, items: items)
    }
    func documentMarker(_ nonce: String) -> String { "BUILDER_FIREFOX_COPY_" + nonce }
    func witnessMarker(_ nonce: String) -> String { "BUILDER_FIREFOX_WITNESS_" + nonce }
    func text(_ item: Item, _ type: NSPasteboard.PasteboardType) -> String? {
        guard let data = item.flavors.first(where: { $0.name == type.rawValue })?.data else { return nil }
        if let value = String(data: data, encoding: .utf8) { return value }
        if data.starts(with: [0xff, 0xfe]) || data.starts(with: [0xfe, 0xff]) { return String(data: data, encoding: .utf16) }
        return nil
    }
    func run(_ args: [String]) throws -> [String: Any] {
        guard let mode = args.first else { throw Failure(code: "USAGE") }
        if mode == "metadata" {
            guard args.count == 1 else { throw Failure(code: "USAGE") }
            return metadata(try snapshot())
        }
        guard args.count >= 3, UUID(uuidString: args[2]) != nil else { throw Failure(code: "USAGE_OR_NONCE_INVALID") }
        let filename = args[1], nonce = args[2]
        if mode == "backup" {
            guard args.count == 3 else { throw Failure(code: "USAGE") }
            let saved = try snapshot(), encoder = PropertyListEncoder()
            encoder.outputFormat = .binary
            try writeExclusive(encoder.encode(Backup(schema: 1, nonce: nonce, changeCount: saved.changeCount, items: saved.items)), filename)
            var result = metadata(saved); result["backup_created"] = true; return result
        }
        if mode == "witness" {
            guard args.count == 3 else { throw Failure(code: "USAGE") }
            let (backup, _) = try privateBackup(filename, nonce), current = try snapshot()
            guard current.changeCount == backup.changeCount, framed(current.items) == framed(backup.items) else { throw Failure(code: "CLIPBOARD_CHANGED_AFTER_BACKUP") }
            let item = NSPasteboardItem(), marker = witnessMarker(nonce)
            guard item.setString(marker, forType: .string), item.setString("<p>" + marker + "</p>", forType: .html) else {
                throw Failure(code: "WITNESS_REPRESENTATION_REFUSED")
            }
            let pb = NSPasteboard.general
            try clearIfUnchanged(current)
            let written = pb.writeObjects([item])
            guard written else { throw Failure(code: "WITNESS_WRITE_FAILED") }
            let observed = try snapshot()
            guard observed.items.count == 1, text(observed.items[0], .string) == marker,
                  text(observed.items[0], .html) == "<p>" + marker + "</p>" else { throw Failure(code: "WITNESS_NOT_OBSERVED") }
            ownedReceipt = metadata(observed)
            var result = metadata(observed); result["witness_observed"] = true; return result
        }
        if mode == "capture" {
            guard args.count == 3 else { throw Failure(code: "USAGE") }
            // Capture staging must be in the caller-created private 0700 directory, never public evidence.
            let parent = URL(fileURLWithPath: filename).deletingLastPathComponent().path
            var directory = stat()
            guard lstat(parent, &directory) == 0, directory.st_uid == geteuid(),
                  directory.st_mode & mode_t(S_IFMT) == mode_t(S_IFDIR), directory.st_mode & 0o777 == 0o700 else {
                throw Failure(code: "PRIVATE_CAPTURE_DIRECTORY_REQUIRED")
            }
            let observed = try snapshot(), marker = documentMarker(nonce)
            // Both flavors of the same single owned item must carry the unique document marker.
            guard observed.items.count == 1,
                  let html = text(observed.items[0], .html), let plain = text(observed.items[0], .string),
                  html.contains(marker), plain.contains(marker) else {
                var result = metadata(observed); result["captured"] = false
                result["reason"] = "EXPECTED_SYNTHETIC_MARKER_NOT_FOUND"; return result
            }
            try writeExclusive(Data(html.utf8), filename + ".html")
            try writeExclusive(Data(plain.utf8), filename + ".txt")
            var result = metadata(observed); result["captured"] = true
            result["html_utf8_bytes"] = html.lengthOfBytes(using: .utf8)
            result["plain_utf8_bytes"] = plain.lengthOfBytes(using: .utf8)
            result["flavors"] = observed.items[0].flavors.filter { [NSPasteboard.PasteboardType.html.rawValue, NSPasteboard.PasteboardType.string.rawValue].contains($0.name) }.map {
                ["type": $0.name, "raw_bytes": $0.data.count, "raw_sha256": digest($0.data)] as [String: Any]
            }
            return result
        }
        if mode == "restore" {
            guard args.count == 5, let expectedCount = Int(args[4]), args[3].count == 64 else { throw Failure(code: "USAGE") }
            let (backup, identity) = try privateBackup(filename, nonce), current = try snapshot()
            let alreadyOriginal = framed(current.items) == framed(backup.items)
            // Attribution is a precise prior receipt, never presence of a substring marker.
            guard (alreadyOriginal && current.changeCount == backup.changeCount) || (current.changeCount == expectedCount && digest(framed(current.items)) == args[3]) else {
                throw Failure(code: "UNOWNED_CURRENT_CLIPBOARD_BACKUP_RETAINED")
            }
            if !alreadyOriginal {
                let objects = try backup.items.map { saved -> NSPasteboardItem in
                    let item = NSPasteboardItem()
                    for flavor in saved.flavors {
                        guard item.setData(flavor.data, forType: NSPasteboard.PasteboardType(flavor.name)) else { throw Failure(code: "RESTORE_FLAVOR_REFUSED") }
                    }
                    return item
                }
                let pb = NSPasteboard.general
                try clearIfUnchanged(current)
                if !objects.isEmpty {
                    let written = pb.writeObjects(objects)
                    guard written else { throw Failure(code: "RESTORE_WRITE_FAILED_BACKUP_RETAINED") }
                }
            }
            let restored = try snapshot()
            guard framed(restored.items) == framed(backup.items) else { throw Failure(code: "RESTORE_MISMATCH_BACKUP_RETAINED") }
            guard NSPasteboard.general.changeCount == restored.changeCount else { throw Failure(code: "CLIPBOARD_CHANGED_BEFORE_BACKUP_REMOVE") }
            var currentIdentity = stat()
            guard lstat(filename, &currentIdentity) == 0, currentIdentity.st_dev == identity.st_dev,
                  currentIdentity.st_ino == identity.st_ino else { throw Failure(code: "BACKUP_PATH_CHANGED_NOT_REMOVED") }
            guard Darwin.unlink(filename) == 0 else { throw Failure(code: "BACKUP_REMOVE_FAILED") }
            var result = metadata(restored); result["restored"] = true; result["backup_removed"] = true
            result["all_items_types_data_equal"] = true; return result
        }
        throw Failure(code: "UNKNOWN_MODE")
    }
}

let recipe = ClipboardRecipe()
do {
    let result = try recipe.run(Array(CommandLine.arguments.dropFirst()))
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
} catch {
    var result: [String: Any] = ["ok": false, "error": (error as? Failure)?.code ?? "CLIPBOARD_RECIPE_FAILED"]
    if let receipt = recipe.ownedReceipt { result["owned_receipt"] = receipt }
    if let data = try? JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]) { print(String(decoding: data, as: UTF8.self)) }
    exit(1)
}
