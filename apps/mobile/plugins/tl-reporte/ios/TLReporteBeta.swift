import Foundation
import CoreMotion
import MetricKit
import UIKit
import WebKit

/* 8f · Lo de la beta en TLReporte (fase8-apps.md §4 8f), aparte del plugin para que TLReportePlugin.swift cambie poco:
   - TLCierres: los cierres y cuelgues de la vez anterior por MetricKit (iOS 15+ los entrega al abrir otra vez). Se guardan en Application Support
     (fuera de la copia de iCloud) hasta que la página los pide (cierres) y se olvidan. Solo el tipo, la señal, el motivo y la pila por binario y
     desplazamiento: nada de la persona (el servidor lo vuelve a tapar).
   - TLAgitar: el acelerómetro (CoreMotion, sin permiso del sistema) SOLO mientras la página lo enciende (builds de prueba); al agitar, la captura
     del WebView (JPEG, en memoria, nunca en disco) y el aviso «agitado». La captura sale del teléfono solo si la persona toca «Enviar». */
final class TLCierres: NSObject, MXMetricManagerSubscriber {
    static let shared = TLCierres()
    private var empezado = false
    private let cola = DispatchQueue(label: "com.tolatino.tlcierres")

    func empezar() {
        var ya = false
        cola.sync { ya = empezado; empezado = true }
        if !ya { MXMetricManager.shared.add(self) }
    }

    private func archivo() -> URL? {
        guard var d = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else { return nil }
        var v = URLResourceValues(); v.isExcludedFromBackup = true
        try? d.setResourceValues(v)
        return d.appendingPathComponent("tl-cierres.json")
    }

    private func leerArchivo() -> [[String: String]] {
        guard let u = archivo(), let d = try? Data(contentsOf: u), let a = try? JSONSerialization.jsonObject(with: d) as? [[String: String]] else { return [] }
        return a
    }

    static func pila(_ t: MXCallStackTree) -> String {
        guard let o = try? JSONSerialization.jsonObject(with: t.jsonRepresentation()) as? [String: Any],
              let pilas = o["callStacks"] as? [[String: Any]] else { return "" }
        let p = pilas.first { ($0["threadAttributed"] as? Bool) == true } ?? pilas.first
        var lineas: [String] = []
        var cuadro = (p?["callStackRootFrames"] as? [[String: Any]])?.first
        while let c = cuadro, lineas.count < 30 {
            let b = (c["binaryName"] as? String) ?? "?"
            let off = (c["offsetIntoBinaryTextSegment"] as? NSNumber)?.uint64Value ?? 0
            lineas.append("\(lineas.count) \(b) 0x\(String(off, radix: 16))")
            cuadro = (c["subFrames"] as? [[String: Any]])?.first
        }
        return lineas.joined(separator: "\n")
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        var nuevos: [[String: String]] = []
        for p in payloads {
            for c in p.crashDiagnostics ?? [] {
                let partes = ["Cierre de la app", c.terminationReason ?? "", c.exceptionType.map { "excepción \($0)" } ?? "", c.signal.map { "señal \($0)" } ?? ""].filter { !$0.isEmpty }
                nuevos.append(["tipo": "cierre", "titulo": String(partes.joined(separator: " · ").prefix(300)), "pila": TLCierres.pila(c.callStackTree)])
            }
            for h in p.hangDiagnostics ?? [] {
                let s = String(format: "%.1f s", h.hangDuration.converted(to: .seconds).value)
                nuevos.append(["tipo": "nativo", "titulo": "La app no respondía (\(s))", "pila": TLCierres.pila(h.callStackTree)])
            }
        }
        if nuevos.isEmpty { return }
        cola.async {
            let todos = Array((self.leerArchivo() + nuevos).suffix(5))
            if let u = self.archivo(), let d = try? JSONSerialization.data(withJSONObject: todos) { try? d.write(to: u, options: .atomic) }
        }
    }

    /* Los cierres guardados, una vez: se entregan y se olvidan. */
    func tomar() -> [[String: String]] {
        var r: [[String: String]] = []
        cola.sync {
            r = leerArchivo()
            if let u = archivo() { try? FileManager.default.removeItem(at: u) }
        }
        return r
    }
}

final class TLAgitar {
    private let movimiento = CMMotionManager()
    private var ultimo: Date = .distantPast
    private var golpes: [Date] = []
    private(set) var captura: String?

    func encender(_ on: Bool, webView: () -> WKWebView?, alAgitar: @escaping () -> Void) {
        if !on || !movimiento.isAccelerometerAvailable { movimiento.stopAccelerometerUpdates(); golpes = []; return }
        if movimiento.isAccelerometerActive { return }
        movimiento.accelerometerUpdateInterval = 0.05
        let vista = webView()
        movimiento.startAccelerometerUpdates(to: .main) { [weak self] d, _ in
            guard let self = self, let a = d?.acceleration else { return }
            let g = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
            if g < 2.3 { return }
            let ahora = Date()
            self.golpes = self.golpes.filter { ahora.timeIntervalSince($0) < 1.2 } + [ahora]
            // Tres sacudidas fuertes en poco más de un segundo, y no más de una vez cada 3 s.
            if self.golpes.count < 3 || ahora.timeIntervalSince(self.ultimo) < 3 { return }
            self.ultimo = ahora; self.golpes = []
            guard let w = vista else { alAgitar(); return }
            w.takeSnapshot(with: nil) { img, _ in
                self.captura = img.flatMap { TLAgitar.reducir($0) }?.jpegData(compressionQuality: 0.7)?.base64EncodedString()
                alAgitar()
            }
        }
    }

    static func reducir(_ i: UIImage) -> UIImage? {
        let lado = max(i.size.width, i.size.height) * i.scale, k = min(1, 1600 / max(lado, 1))
        if k >= 1 { return i }
        let t = CGSize(width: i.size.width * i.scale * k, height: i.size.height * i.scale * k)
        let f = UIGraphicsImageRendererFormat(); f.scale = 1
        return UIGraphicsImageRenderer(size: t, format: f).image { _ in i.draw(in: CGRect(origin: .zero, size: t)) }
    }

    /* La captura, una vez: se entrega y se olvida. */
    func tomarCaptura() -> String? { let c = captura; captura = nil; return c }
}
