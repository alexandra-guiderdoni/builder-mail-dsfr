import AppKit
import Foundation
let args = CommandLine.arguments
let mode = args[1], path = args[2]
let pb = NSPasteboard.general
if mode == "backup" {
 guard !FileManager.default.fileExists(atPath:path) else { throw NSError(domain:"ExistingClipboardBackup",code:1) }
 let items = (pb.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues: item.types.compactMap { type in item.data(forType: type).map { (type.rawValue, $0) } }) }
 let data = try PropertyListSerialization.data(fromPropertyList: items, format: .binary, options: 0)
 try data.write(to: URL(fileURLWithPath: path), options: .atomic)
 try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path)
 print("CLIPBOARD_BACKED_UP")
} else if mode == "capture" {
 let html = pb.string(forType: .html) ?? "", plain = pb.string(forType: .string) ?? ""
 guard html.contains("Recette UX 158–160 — contenu témoin") || plain.contains("Recette UX 158–160 — contenu témoin") else { throw NSError(domain:"DemoClipboardNotConfirmed",code:1) }
 try html.write(toFile:path+".html",atomically:true,encoding:.utf8)
 try plain.write(toFile:path+".txt",atomically:true,encoding:.utf8)
 print("DEMO_CLIPBOARD_CAPTURED")
} else if mode == "restore" {
 let data = try Data(contentsOf: URL(fileURLWithPath:path))
 let items = try PropertyListSerialization.propertyList(from:data,options:[],format:nil) as! [[String:Data]]
 pb.clearContents()
 let objects = items.map { values -> NSPasteboardItem in let item = NSPasteboardItem(); for (key,value) in values { item.setData(value,forType:NSPasteboard.PasteboardType(key)) }; return item }
 if !objects.isEmpty { guard pb.writeObjects(objects) else { throw NSError(domain:"ClipboardRestore",code:1) } }
 let actual = (pb.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues:item.types.compactMap { type in item.data(forType:type).map { (type.rawValue,$0) } }) }
 guard actual == items else { throw NSError(domain:"ClipboardRestoreMismatch",code:2) }
 try FileManager.default.removeItem(atPath:path)
 print("CLIPBOARD_RESTORED_AND_BACKUP_REMOVED")
}
