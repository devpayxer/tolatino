import Foundation
import Capacitor
import CryptoKit
import Security

/* 8a · TLLocal (fase8-apps.md §3.4): el almacén cifrado del teléfono para lo que funciona sin señal (el paquete firmado de la Puerta y su cola,
   los QR de Mis boletos, la cola del Repartidor). Lo usa apps/web/lib/nativo/almacen.ts.
   - La llave: 256 bits al azar en el Keychain, kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly (no viaja a otro teléfono ni a la copia).
   - Los datos: un archivo por fila con AES-GCM (CryptoKit) en Application Support/tl-local, excluido de la copia de iCloud. Nombre del
     archivo = sha256 de la clave.
   - La primera vez que abre una instalación nueva se borra una llave vieja que hubiera quedado en el Keychain (el Keychain sobrevive a borrar
     la app; los archivos no): lo de antes de reinstalar no se lee.
   Métodos: poner, leer, quitar, todos, borrar (los mismos que el Android). */
@objc(TLLocalPlugin)
public class TLLocalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TLLocalPlugin"
    public let jsName = "TLLocal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "poner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "leer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "quitar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "todos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "borrar", returnType: CAPPluginReturnPromise)
    ]

    private let servicio = "com.tolatino.tllocal", cuenta = "llave-v1", marca = "tl-local-instalada"
    private let cola = DispatchQueue(label: "com.tolatino.tllocal")

    override public func load() {
        if !UserDefaults.standard.bool(forKey: marca) {
            SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: servicio] as CFDictionary)
            UserDefaults.standard.set(true, forKey: marca)
        }
    }

    private func llave() throws -> SymmetricKey {
        let q: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: servicio, kSecAttrAccount: cuenta, kSecReturnData: true]
        var out: CFTypeRef?
        if SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data, d.count == 32 { return SymmetricKey(data: d) }
        let nueva = SymmetricKey(size: .bits256)
        let d = nueva.withUnsafeBytes { Data($0) }
        let add: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: servicio, kSecAttrAccount: cuenta, kSecValueData: d,
                                    kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let st = SecItemAdd(add as CFDictionary, nil)
        guard st == errSecSuccess else { throw NSError(domain: "TLLocal", code: Int(st)) }
        return nueva
    }

    private func raiz() throws -> URL {
        var u = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("tl-local", isDirectory: true)
        try FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        var v = URLResourceValues(); v.isExcludedFromBackup = true
        try u.setResourceValues(v)
        return u
    }

    private func valido(_ s: String) -> Bool { s.range(of: "^[a-z0-9-]{1,40}$", options: .regularExpression) != nil }

    private func dir(_ ns: String, _ tienda: String?) throws -> URL {
        guard valido(ns), tienda == nil || valido(tienda!) else { throw NSError(domain: "TLLocal", code: 1) }
        var u = try raiz().appendingPathComponent(ns, isDirectory: true)
        if let t = tienda { u = u.appendingPathComponent(t, isDirectory: true); try FileManager.default.createDirectory(at: u, withIntermediateDirectories: true) }
        return u
    }

    private func archivo(_ ns: String, _ tienda: String, _ clave: String) throws -> URL {
        let h = SHA256.hash(data: Data(clave.utf8)).map { String(format: "%02x", $0) }.joined()
        return try dir(ns, tienda).appendingPathComponent("\(h).bin")
    }

    private func abrir(_ u: URL) throws -> String {
        let caja = try AES.GCM.SealedBox(combined: try Data(contentsOf: u))
        return String(decoding: try AES.GCM.open(caja, using: try llave()), as: UTF8.self)
    }

    @objc func poner(_ call: CAPPluginCall) {
        let ns = call.getString("ns") ?? "", t = call.getString("tienda") ?? "", k = call.getString("clave") ?? "", v = call.getString("valor") ?? ""
        cola.async {
            do {
                guard v.utf8.count <= 4_000_000 else { throw NSError(domain: "TLLocal", code: 2) }
                let caja = try AES.GCM.seal(Data(v.utf8), using: try self.llave())
                try caja.combined!.write(to: try self.archivo(ns, t, k), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                call.resolve()
            } catch { call.reject("No se pudo guardar.") }
        }
    }

    @objc func leer(_ call: CAPPluginCall) {
        let ns = call.getString("ns") ?? "", t = call.getString("tienda") ?? "", k = call.getString("clave") ?? ""
        cola.async {
            guard let u = try? self.archivo(ns, t, k), FileManager.default.fileExists(atPath: u.path), let v = try? self.abrir(u) else { call.resolve(["valor": NSNull()]); return }
            call.resolve(["valor": v])
        }
    }

    @objc func quitar(_ call: CAPPluginCall) {
        let ns = call.getString("ns") ?? "", t = call.getString("tienda") ?? "", k = call.getString("clave") ?? ""
        cola.async {
            if let u = try? self.archivo(ns, t, k) { try? FileManager.default.removeItem(at: u) }
            call.resolve()
        }
    }

    @objc func todos(_ call: CAPPluginCall) {
        let ns = call.getString("ns") ?? "", t = call.getString("tienda") ?? ""
        cola.async {
            var valores: [String] = []
            if let d = try? self.dir(ns, t), let L = try? FileManager.default.contentsOfDirectory(at: d, includingPropertiesForKeys: nil) {
                for u in L where u.pathExtension == "bin" { if let v = try? self.abrir(u) { valores.append(v) } }
            }
            call.resolve(["valores": valores])
        }
    }

    @objc func borrar(_ call: CAPPluginCall) {
        let ns = call.getString("ns") ?? ""
        cola.async {
            if let d = try? self.dir(ns, nil) { try? FileManager.default.removeItem(at: d) }
            call.resolve()
        }
    }
}
