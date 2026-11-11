package com.tolatino.plugins;

import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePublicKeyCredentialRequest;
import androidx.credentials.CreatePublicKeyCredentialResponse;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPublicKeyCredentialOption;
import androidx.credentials.PublicKeyCredential;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

/* 8d · TLLlave (fase8-apps.md §3.4): llaves de acceso (passkeys) con Credential Manager de Android (androidx.credentials, versión fija en
   sabores.gradle). La web le pasa las opciones del servidor (JSON estándar de WebAuthn) y recibe la respuesta en el MISMO JSON estándar
   (Credential Manager ya habla ese JSON): el servidor verifica todo (lib/llaves/llaves.ts). Aquí no se decide nada.
   Solo responde si capacitor.config.json (plugins.TLLlave, generado desde apps.json) dice `activas` y trae el RP ID, y si las opciones son de
   ESE RP ID. Las enciende 8b, cuando el dominio sirva assetlinks.json con `get_login_creds` (y 8h sume el origen android:apk-key-hash de la
   llave de firma al servidor): antes, `disponible` dice que no y la página no ofrece la llave (nunca un botón roto). */
@CapacitorPlugin(name = "TLLlave")
public class TLLlavePlugin extends Plugin {

    private String rpId = "";
    private boolean activas = false;

    @Override
    public void load() {
        try {
            JSONObject c = getConfig().getConfigJSON();
            rpId = c.optString("rpId", "");
            activas = c.optBoolean("activas", false);
        } catch (Exception e) { /* sin configuración: apagadas */ }
    }

    private boolean puede() {
        return activas && !rpId.isEmpty() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
    }

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("entrar", puede());
        r.put("plataforma", puede());
        call.resolve(r);
    }

    /* Las opciones, si son JSON de ESTE RP ID (el `rp.id` del registro o el `rpId` de entrar). */
    private String opciones(PluginCall call, boolean registro) {
        String t = call.getString("opciones");
        if (t == null || t.length() > 24000) return null;
        try {
            JSONObject o = new JSONObject(t);
            String id = registro ? (o.optJSONObject("rp") != null ? o.getJSONObject("rp").optString("id", "") : "") : o.optString("rpId", "");
            return rpId.equals(id) ? t : null;
        } catch (Exception e) { return null; }
    }

    private void responder(PluginCall call, String json) {
        JSObject r = new JSObject();
        r.put("respuesta", json);
        call.resolve(r);
    }

    private void rechazar(PluginCall call, boolean cancelado, String m) {
        // Cerrar el diálogo del sistema no es un error para la persona: la web lo trata como «cancelado» (sigue con el código).
        if (cancelado) call.reject("NotAllowedError: cancelado", "cancelado");
        else call.reject("TLLlave: " + (m == null ? "fallo" : m), "fallo");
    }

    @PluginMethod
    public void crear(PluginCall call) {
        String o = puede() ? opciones(call, true) : null;
        if (o == null || getActivity() == null) { call.reject("TLLlave: opciones no válidas", "opciones"); return; }
        CredentialManager cm = CredentialManager.create(getContext());
        cm.createCredentialAsync(getActivity(), new CreatePublicKeyCredentialRequest(o), null, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse r) {
                    if (r instanceof CreatePublicKeyCredentialResponse) responder(call, ((CreatePublicKeyCredentialResponse) r).getRegistrationResponseJson());
                    else call.reject("TLLlave: respuesta", "respuesta");
                }

                @Override
                public void onError(CreateCredentialException e) {
                    rechazar(call, e instanceof CreateCredentialCancellationException, e.getMessage());
                }
            });
    }

    @PluginMethod
    public void obtener(PluginCall call) {
        String o = puede() ? opciones(call, false) : null;
        if (o == null || getActivity() == null) { call.reject("TLLlave: opciones no válidas", "opciones"); return; }
        CredentialManager cm = CredentialManager.create(getContext());
        GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(new GetPublicKeyCredentialOption(o)).build();
        cm.getCredentialAsync(getActivity(), req, null, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse r) {
                    Credential c = r.getCredential();
                    if (c instanceof PublicKeyCredential) responder(call, ((PublicKeyCredential) c).getAuthenticationResponseJson());
                    else call.reject("TLLlave: respuesta", "respuesta");
                }

                @Override
                public void onError(GetCredentialException e) {
                    rechazar(call, e instanceof GetCredentialCancellationException, e.getMessage());
                }
            });
    }
}
