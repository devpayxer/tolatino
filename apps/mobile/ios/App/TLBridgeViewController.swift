import UIKit
import WebKit
import Capacitor

/* 8a · El puente solo para nuestro origen (fase8-apps.md §3.1 «Seguridad del WebView»). Capacitor inyecta su JS solo en el marco principal,
   pero el manejador de mensajes «bridge» de WKWebView lo puede llamar CUALQUIER marco (un iframe de otro origen —Stripe o quien sea— podría
   escribir window.webkit.messageHandlers.bridge.postMessage). Aquí se reemplaza por un portero: solo pasan los mensajes del marco principal
   y de nuestro servidor o del origen local de las islas; lo demás se descarta. App-Bound Domains (WKAppBoundDomains) queda declarado y
   apagado hasta comprobar en el simulador que no rompe la hoja de Stripe y su 3-D Secure (a verificar, LAUNCH-CHECKLIST). */
final class TLPortero: NSObject, WKScriptMessageHandler {
    private weak var destino: WKScriptMessageHandler?
    private let origenes: Set<String>
    init(destino: WKScriptMessageHandler, origenes: Set<String>) { self.destino = destino; self.origenes = origenes }

    static func origen(_ esquema: String?, _ host: String?, _ puerto: Int?) -> String {
        let p = (puerto ?? 0) > 0 ? ":\(puerto!)" : ""
        return "\((esquema ?? "").lowercased())://\((host ?? "").lowercased())\(p)"
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        let o = message.frameInfo.securityOrigin
        guard origenes.contains(TLPortero.origen(o.protocol, o.host, o.port)) else { return }
        destino?.userContentController(userContentController, didReceive: message)
    }
}

class TLBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        guard let bridge = bridge as? CapacitorBridge else { return }
        let h = bridge.webViewDelegationHandler
        let c = bridge.config
        // Solo dos orígenes: el local de las islas (capacitor://localhost) y nuestro servidor (https://pruebas.tolatino.com).
        let origenes: Set<String> = [TLPortero.origen(c.localURL.scheme, c.localURL.host, c.localURL.port),
                                     TLPortero.origen(c.serverURL.scheme, c.serverURL.host, c.serverURL.port)]
        h.contentController.removeScriptMessageHandler(forName: "bridge")
        h.contentController.add(TLPortero(destino: h, origenes: origenes), name: "bridge")
    }
}
