import Foundation
import Capacitor
import CoreLocation

/* 8e · TLRuta (fase8-apps.md §3.1, §4 8e, §6 #14): la ubicación del Repartidor SOLO durante una entrega activa. Solo en el target
   ToLatinoRepartidor (apps.json; guardián permisosMinimos), el único con UIBackgroundModes = location y el texto de «mientras se usa».
   - Permiso «Cuando se usa la app» (requestWhenInUseAuthorization); nunca «Siempre». Con la entrega en curso sigue con la pantalla apagada porque
     el target declara el modo de fondo de ubicación y el gestor tiene allowsBackgroundLocationUpdates; iOS muestra el indicador azul
     (showsBackgroundLocationIndicator) todo ese tiempo.
   - Empieza con el token que el servidor dio en el paso que inicia la entrega o al reanudarla; termina con detener() («Entregado») o sola, cuando
     el servidor contesta 401/410 o «activa: false».
   - Las posiciones van SOLO al servidor de la cáscara (plugins.TLRuta.servidor, generado desde apps.json), nunca a una dirección de la página
     (guardián rutaSoloNuestroServidor). En un build Debug, el humo puede apuntar a 127.0.0.1 (servidorPrueba); Release la ignora.
   - Sin señal: la cola queda en memoria (máx. 600) y sube en lotes de 60 al volver. Métodos: empezar, detener, estado, permiso. */
@objc(TLRutaPlugin)
public class TLRutaPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "TLRutaPlugin"
    public let jsName = "TLRuta"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "empezar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "detener", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "estado", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "permiso", returnType: CAPPluginReturnPromise)
    ]

    private let gestor = CLLocationManager()
    private var servidor = "", rotulo = "", token: String?, entrega: String?
    private var cadaS = 10, minM = 25.0
    private var cola: [[String: Any]] = []
    private var ultima: CLLocation?
    private var ultimaEnviada: Int64 = 0, sinSenal = false, enviando = false, activo = false
    private var reloj: Timer?
    private var esperando: CAPPluginCall?

    override public func load() {
        gestor.delegate = self
        let c = getConfig()
        servidor = (c.getString("servidor", "") ?? "").replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        rotulo = c.getString("rotulo", "") ?? ""
    }

    private func servidorDe(_ call: CAPPluginCall) -> String {
        #if DEBUG
        if let p = call.getString("servidorPrueba"), let u = URL(string: p), u.scheme == "http", let h = u.host, h == "127.0.0.1" || h == "localhost", let port = u.port {
            return "http://\(h):\(port)"
        }
        #endif
        return servidor
    }

    @objc func empezar(_ call: CAPPluginCall) {
        guard let tk = call.getString("token"), tk.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil,
              let en = call.getString("entrega"), en.range(of: "^[0-9]{1,12}$", options: .regularExpression) != nil else { call.reject("token o entrega no válidos"); return }
        let srv = servidorDe(call)
        guard !srv.isEmpty else { call.reject("sin servidor"); return }
        DispatchQueue.main.async {
            if self.entrega != nil && self.entrega != en { self.cola.removeAll() }
            self.token = tk; self.entrega = en; self.servidor = srv
            self.cadaS = max(5, min(60, call.getInt("cadaS") ?? 10))
            self.minM = Double(max(5, min(200, call.getInt("minM") ?? 25)))
            switch self.gestor.authorizationStatus {
            case .notDetermined:
                self.esperando = call
                self.gestor.requestWhenInUseAuthorization() // nunca «Siempre»
            case .denied, .restricted:
                self.limpiar(); call.resolve(["estado": "negado"])
            default:
                self.arrancar(); call.resolve(["estado": "ok"])
            }
        }
    }

    public func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        guard let call = esperando else { return }
        let s = m.authorizationStatus
        if s == .notDetermined { return }
        esperando = nil
        if s == .authorizedWhenInUse || s == .authorizedAlways { arrancar(); call.resolve(["estado": "ok"]) }
        else { limpiar(); call.resolve(["estado": "negado"]) }
    }

    private func arrancar() {
        gestor.desiredAccuracy = kCLLocationAccuracyBest
        gestor.distanceFilter = kCLDistanceFilterNone // se anota cada cadaS segundos o si se movió minM (abajo)
        gestor.activityType = .otherNavigation
        gestor.pausesLocationUpdatesAutomatically = false
        gestor.allowsBackgroundLocationUpdates = true
        gestor.showsBackgroundLocationIndicator = true
        gestor.startUpdatingLocation()
        activo = true
        reloj?.invalidate()
        reloj = Timer.scheduledTimer(withTimeInterval: TimeInterval(max(5, cadaS)), repeats: true) { [weak self] _ in self?.subir() }
    }

    public func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard activo else { return }
        for l in locations {
            if l.horizontalAccuracy < 0 || l.horizontalAccuracy > 200 { continue }
            if let u = ultima {
                let dt = l.timestamp.timeIntervalSince(u.timestamp)
                if dt <= 0 { continue }
                if dt < Double(cadaS) && l.distance(from: u) < minM { continue }
            }
            ultima = l
            var p: [String: Any] = ["t": Int64(l.timestamp.timeIntervalSince1970 * 1000), "lat": l.coordinate.latitude, "lng": l.coordinate.longitude, "acc": min(500, l.horizontalAccuracy)]
            if l.speed >= 0 { p["vel"] = min(100, l.speed) }
            if l.course >= 0 { p["rumbo"] = l.course.truncatingRemainder(dividingBy: 360) }
            cola.append(p)
            if cola.count > 600 { cola.removeFirst(cola.count - 600) }
        }
        if ultimaEnviada == 0 { subir() }
    }

    private func subir() {
        guard activo, !enviando, !cola.isEmpty, let tk = token, let url = URL(string: servidor + "/api/ruta/posicion") else { return }
        let lote = Array(cola.prefix(60))
        guard let cuerpo = try? JSONSerialization.data(withJSONObject: ["fuente": "app", "p": lote]) else { return }
        var r = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
        r.httpMethod = "POST"
        r.httpShouldHandleCookies = false
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.setValue("Bearer \(tk)", forHTTPHeaderField: "Authorization")
        if !rotulo.isEmpty { r.setValue("ToLatinoRepartidor \(rotulo)", forHTTPHeaderField: "User-Agent") }
        r.httpBody = cuerpo
        enviando = true
        URLSession.shared.dataTask(with: r) { [weak self] data, resp, err in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.enviando = false
                guard err == nil, let h = resp as? HTTPURLResponse else { self.sinSenal = true; return } // queda en la cola
                self.sinSenal = false
                let j = (data.flatMap { try? JSONSerialization.jsonObject(with: $0) }) as? [String: Any]
                let activa = (j?["activa"] as? Bool) ?? (h.statusCode < 400)
                if h.statusCode == 401 || h.statusCode == 410 || !activa { self.limpiar(); return } // la entrega terminó
                if h.statusCode == 200 {
                    self.cola.removeFirst(min(lote.count, self.cola.count))
                    self.ultimaEnviada = Int64(Date().timeIntervalSince1970 * 1000)
                }
            }
        }.resume()
    }

    private func limpiar() {
        gestor.stopUpdatingLocation()
        gestor.allowsBackgroundLocationUpdates = false
        reloj?.invalidate(); reloj = nil
        activo = false; token = nil; entrega = nil; cola.removeAll(); ultima = nil; ultimaEnviada = 0; sinSenal = false
    }

    @objc func detener(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.limpiar(); call.resolve() }
    }

    @objc func estado(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var r: [String: Any] = ["activo": self.activo, "pendientes": self.cola.count, "sinSenal": self.sinSenal]
            if let e = self.entrega { r["entrega"] = e }
            if self.ultimaEnviada > 0 { r["ultimaEnviada"] = self.ultimaEnviada }
            call.resolve(r)
        }
    }

    @objc func permiso(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let s = self.gestor.authorizationStatus
            call.resolve(["estado": s == .authorizedWhenInUse || s == .authorizedAlways ? "concedido" : s == .notDetermined ? "preguntar" : "negado"])
        }
    }
}
