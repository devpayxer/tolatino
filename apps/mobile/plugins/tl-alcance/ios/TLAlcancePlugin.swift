import Foundation
import Capacitor
import WebKit

/* 8a · TLAlcance (fase8-apps.md §3.1 «Alcance de navegación»; guardián cascaraSoloSuAlcance): el filtro NATIVO de navegación de cada cáscara.
   Sin métodos para la web: en cada navegación del marco principal decide si la ruta es de ESTA app. Lee su alcance de capacitor.config.json
   (plugins.TLAlcance, generado desde apps.json: el mismo que aplica el servidor en apps/web/lib/app-nativa-comun.ts).
   - Nuestro servidor y ruta común, técnica, de inicio o propia → la cáscara la abre.
   - Nuestro servidor y ruta de otra app o del Super Admin → fuera (el sistema la abre en esa app si está instalada, o en Safari).
   - Otro origen: Capacitor ya lo manda fuera (allowNavigation solo trae nuestro dominio). El origen local (islas) → la cáscara. */
@objc(TLAlcancePlugin)
public class TLAlcancePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TLAlcancePlugin"
    public let jsName = "TLAlcance"
    public let pluginMethods: [CAPPluginMethod] = []

    private var host = ""
    private var comunes: [String] = [], inicio: [String] = [], propias: [String] = [], ajenas: [String] = []

    override public func load() {
        let c = getConfig()
        host = c.getString("host", "") ?? ""
        let lista = { (k: String) -> [String] in (c.getArray(k, []) ?? []).compactMap { $0 as? String } }
        comunes = lista("comunes"); inicio = lista("inicio"); propias = lista("propias"); ajenas = lista("ajenas")
    }

    private func bajo(_ ruta: String, _ p: String) -> Bool { p == "/" || ruta == p || ruta.hasPrefix(p + "/") }
    private func alguna(_ ruta: String, _ L: [String]) -> Bool { L.contains { bajo(ruta, $0) } }

    /* ¿La abre esta app? (el mismo orden que duenoDe(): común y técnica, inicio exacto, lo de otra app, lo propio). */
    func enAlcance(_ ruta: String) -> Bool {
        if alguna(ruta, comunes) { return true }
        if inicio.contains(ruta) { return true }
        if alguna(ruta, ajenas) { return false }
        return alguna(ruta, propias)
    }

    override public func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard !host.isEmpty, let url = navigationAction.request.url, let h = url.host else { return nil }
        if navigationAction.targetFrame != nil && navigationAction.targetFrame?.isMainFrame == false { return nil }
        let hp = url.port.map { "\(h):\($0)" } ?? h
        guard hp.caseInsensitiveCompare(host) == .orderedSame else { return nil } // otro origen o el local: lo decide Capacitor
        let ruta = url.path.isEmpty ? "/" : url.path
        if enAlcance(ruta) { return nil } // es de esta app: la abre la cáscara
        DispatchQueue.main.async { UIApplication.shared.open(url) }
        return true
    }
}
