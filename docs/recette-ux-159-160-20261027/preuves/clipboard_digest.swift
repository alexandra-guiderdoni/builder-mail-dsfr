import AppKit
import Foundation
import CryptoKit
let pb = NSPasteboard.general
var hash = SHA256()
for (i,item) in (pb.pasteboardItems ?? []).enumerated() {
 hash.update(data: Data("item:\(i)\n".utf8))
 for type in item.types.sorted(by: {$0.rawValue < $1.rawValue}) {
  hash.update(data: Data((type.rawValue+"\n").utf8))
  if let data=item.data(forType:type) {hash.update(data:data)}
 }
}
let result:[String:Any] = ["changeCount":pb.changeCount,"digest":hash.finalize().map{String(format:"%02x",$0)}.joined()]
let data=try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys]);print(String(data:data,encoding:.utf8)!)
