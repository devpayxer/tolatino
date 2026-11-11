import Foundation
import Capacitor
import AuthenticationServices
import LocalAuthentication

/* 8d · TLLlave (fase8-apps.md §3.4): llaves de acceso (passkeys) con la API del sistema, ASAuthorizationPlatformPublicKeyCredentialProvider
   (iOS 16+). WebAuthn dentro del WKWebView no es seguro de asumir; esto sí. La web le pasa las opciones del servidor (JSON estándar de WebAuthn)
   y recibe la respuesta en el MISMO JSON estándar: el servidor verifica todo (lib/llaves/llaves.ts). Aquí no se decide nada.
   Solo responde si capacitor.config.json (plugins.TLLlave, generado desde apps.json) dice `activas` y trae el RP ID, y si las opciones son de
   ESE RP ID. Las enciende 8b, cuando el dominio sirva apple-app-site-association con `webcredentials` y la app lleve el dominio asociado:
   antes, `disponible` dice que no y la página no ofrece la llave (nunca un botón roto). */
@objc(TLLlavePlugin)
public class TLLlavePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "TLLlavePlugin"
    public let jsName = "TLLlave"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "disponible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "crear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "obtener", returnType: CAPPluginReturnPromise),
    ]

    private var rpId = ""
    private var activas = false
    private var pendiente: CAPPluginCall?
    private var controlador: ASAuthorizationController?

    override public func load() {
        rpId = getConfig().getString("rpId", "") ?? ""
        activas = getConfig().getBoolean("activas", false)
    }

    private func puede() -> Bool {
        guard activas, !rpId.isEmpty else { return false }
        // Las llaves del sistema piden que el teléfono tenga código (y Face ID o Touch ID si lo hay).
        return LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
    }

    @objc func disponible(_ call: CAPPluginCall) {
        let si = puede()
        call.resolve(["entrar": si, "plataforma": si])
    }

    private static func deB64(_ x: Any?) -> Data? {
        guard var s = x as? String, !s.isEmpty else { return nil }
        s = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s += "=" }
        return Data(base64Encoded: s)
    }
    private static func aB64(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    private func opciones(_ call: CAPPluginCall) -> [String: Any]? {
        guard let t = call.getString("opciones"), t.count < 24_000, let d = t.data(using: .utf8) else { return nil }
        return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
    }

    @objc func crear(_ call: CAPPluginCall) {
        guard puede(), let o = opciones(call), let rp = o["rp"] as? [String: Any], (rp["id"] as? String) == rpId,
              let reto = TLLlavePlugin.deB64(o["challenge"]), let user = o["user"] as? [String: Any], let uid = TLLlavePlugin.deB64(user["id"]),
              let nombre = user["name"] as? String else { call.reject("TLLlave: opciones no válidas", "opciones"); return }
        let r = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId).createCredentialRegistrationRequest(challenge: reto, name: nombre, userID: uid)
        r.userVerificationPreference = .required
        if #available(iOS 17.4, *), let ex = o["excludeCredentials"] as? [[String: Any]] {
            r.excludedCredentials = ex.compactMap { TLLlavePlugin.deB64($0["id"]) }.map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
        }
        lanzar(call, r)
    }

    @objc func obtener(_ call: CAPPluginCall) {
        guard puede(), let o = opciones(call), (o["rpId"] as? String) == rpId, let reto = TLLlavePlugin.deB64(o["challenge"]) else {
            call.reject("TLLlave: opciones no válidas", "opciones"); return
        }
        let r = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId).createCredentialAssertionRequest(challenge: reto)
        r.userVerificationPreference = .required
        if let al = o["allowCredentials"] as? [[String: Any]], !al.isEmpty {
            r.allowedCredentials = al.compactMap { TLLlavePlugin.deB64($0["id"]) }.map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
        }
        lanzar(call, r)
    }

    private func lanzar(_ call: CAPPluginCall, _ r: ASAuthorizationRequest) {
        DispatchQueue.main.async {
            if self.pendiente != nil { call.reject("TLLlave: ocupado", "ocupado"); return }
            self.pendiente = call
            let c = ASAuthorizationController(authorizationRequests: [r])
            c.delegate = self
            c.presentationContextProvider = self
            self.controlador = c
            c.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }

    private func responder(_ call: CAPPluginCall, _ j: [String: Any]) {
        guard let d = try? JSONSerialization.data(withJSONObject: j), let t = String(data: d, encoding: .utf8) else { call.reject("TLLlave: respuesta", "respuesta"); return }
        call.resolve(["respuesta": t])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendiente else { return }
        pendiente = nil
        controlador = nil
        if let x = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration, let att = x.rawAttestationObject {
            let id = TLLlavePlugin.aB64(x.credentialID)
            responder(call, ["id": id, "rawId": id, "type": "public-key", "authenticatorAttachment": "platform", "clientExtensionResults": [String: Any](),
                             "response": ["clientDataJSON": TLLlavePlugin.aB64(x.rawClientDataJSON), "attestationObject": TLLlavePlugin.aB64(att), "transports": ["internal", "hybrid"]]])
        } else if let x = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
            let id = TLLlavePlugin.aB64(x.credentialID)
            var resp: [String: Any] = ["clientDataJSON": TLLlavePlugin.aB64(x.rawClientDataJSON)]
            if let a = x.rawAuthenticatorData { resp["authenticatorData"] = TLLlavePlugin.aB64(a) }
            if let s = x.signature { resp["signature"] = TLLlavePlugin.aB64(s) }
            if let u = x.userID { resp["userHandle"] = TLLlavePlugin.aB64(u) }
            responder(call, ["id": id, "rawId": id, "type": "public-key", "authenticatorAttachment": "platform", "clientExtensionResults": [String: Any](), "response": resp])
        } else {
            call.reject("TLLlave: respuesta", "respuesta")
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendiente else { return }
        pendiente = nil
        controlador = nil
        // Cerrar el diálogo del sistema no es un error para la persona: la web lo trata como «cancelado» (sigue con el código).
        if let e = error as? ASAuthorizationError, e.code == .canceled { call.reject("NotAllowedError: cancelado", "cancelado"); return }
        call.reject("TLLlave: \(error.localizedDescription)", "fallo")
    }
}
