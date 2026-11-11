import Foundation
import Capacitor

/* 8a · TLReporte (lo mínimo de 8a; fase8-apps.md §3.1): el registro técnico en anillo (las últimas 200 líneas: pantallas por familia de ruta,
   errores de la página y cambios de señal; nunca lo que la persona escribe), en Application Support (fuera de la copia de iCloud); sobrevive
   a un cierre. «Reportar un problema» (8f) lo lee solo al tocar «Enviar». Captura, agitar y MetricKit llegan en 8f.
   Métodos: anotar, leer (los mismos que el Android). */
@objc(TLReportePlugin)
public class TLReportePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TLReportePlugin"
    public let jsName = "TLReporte"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "anotar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "leer", returnType: CAPPluginReturnPromise)
    ]
    private let anillo = 200
    private var lineas: [String] = []
    private var cargado = false
    private let cola = DispatchQueue(label: "com.tolatino.tlreporte")

    private func archivo() -> URL? {
        guard var d = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else { return nil }
        var v = URLResourceValues(); v.isExcludedFromBackup = true
        try? d.setResourceValues(v)
        return d.appendingPathComponent("tl-reporte.txt")
    }

    private func cargar() {
        if cargado { return }
        cargado = true
        if let u = archivo(), let t = try? String(contentsOf: u, encoding: .utf8) { lineas = t.split(separator: "\n").map(String.init) }
        if lineas.count > anillo { lineas.removeFirst(lineas.count - anillo) }
    }

    @objc func anotar(_ call: CAPPluginCall) {
        let l = String((call.getString("linea") ?? "").unicodeScalars.map { CharacterSet.controlCharacters.contains($0) ? " " : Character($0) }.prefix(200))
        cola.async {
            self.cargar()
            self.lineas.append(l)
            if self.lineas.count > self.anillo { self.lineas.removeFirst(self.lineas.count - self.anillo) }
            if let u = self.archivo() { try? self.lineas.joined(separator: "\n").write(to: u, atomically: true, encoding: .utf8) }
            call.resolve()
        }
    }

    @objc func leer(_ call: CAPPluginCall) {
        cola.async {
            self.cargar()
            call.resolve(["lineas": self.lineas.filter { !$0.isEmpty }])
        }
    }
}
