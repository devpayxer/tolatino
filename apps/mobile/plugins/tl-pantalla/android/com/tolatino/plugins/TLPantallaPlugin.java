package com.tolatino.plugins;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* 8a · TLPantalla (fase8-apps.md §3.1): la pantalla encendida mientras la Puerta escanea (y desde 8e mientras el Repartidor entrega), el
   brillo al máximo al mostrar un QR (8e) y abrir los Ajustes de ESTA app cuando la persona negó un permiso (la hoja previa lo ofrece).
   Lo encendido y el brillo se devuelven al salir de la app (la ventana los suelta sola) o al llamar con false. Lo usa lib/nativo/pantalla.ts
   y lib/nativo/permisos.ts. Métodos: mantener, brillo, ajustes (los mismos que el iOS).
   8e · Y en To'Latino Puerta, «Fijar la Puerta en esta pantalla»: fijar (startLockTask: sin ser dueño del dispositivo es la fijación de pantalla
   del sistema, que el teléfono confirma y dice cómo soltar; la página ya pidió confirmarlo), soltar (stopLockTask) y fijada. La linterna en
   Android la prende la página con la cámara (restricción «torch»): aquí linterna contesta ok:false para que la página use la suya. */
@CapacitorPlugin(name = "TLPantalla")
public class TLPantallaPlugin extends Plugin {

    @PluginMethod
    public void mantener(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void brillo(PluginCall call) {
        boolean max = Boolean.TRUE.equals(call.getBoolean("max", false));
        getActivity().runOnUiThread(() -> {
            WindowManager.LayoutParams lp = getActivity().getWindow().getAttributes();
            lp.screenBrightness = max ? 1f : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
            getActivity().getWindow().setAttributes(lp);
            call.resolve();
        });
    }

    @PluginMethod
    public void ajustes(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void fijar(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject r = new JSObject();
            try { getActivity().startLockTask(); r.put("ok", true); } catch (Exception e) { r.put("ok", false); }
            call.resolve(r);
        });
    }

    @PluginMethod
    public void soltar(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { getActivity().stopLockTask(); } catch (Exception e) { /* no estaba fijada */ }
            call.resolve();
        });
    }

    @PluginMethod
    public void fijada(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        JSObject r = new JSObject();
        r.put("fijada", am != null && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE);
        call.resolve(r);
    }

    @PluginMethod
    public void linterna(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", false); // Android: la página prende la luz con la cámara del WebView («torch»)
        call.resolve(r);
    }
}
