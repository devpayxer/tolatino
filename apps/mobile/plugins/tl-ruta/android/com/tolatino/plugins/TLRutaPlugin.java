package com.tolatino.plugins;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/* 8e · TLRuta (fase8-apps.md §3.1, §4 8e, §6 #14): la ubicación del Repartidor SOLO durante una entrega activa. Solo en To'Latino Repartidor
   (apps.json; guardián permisosMinimos). La página la empieza con el token que el servidor dio en el paso que inicia la entrega («Voy por el
   pedido» o «Recogí») o al reanudarla; termina con detener() («Entregado») o sola, cuando el servidor contesta que la entrega ya no está activa.
   - Permiso «mientras se usa» (ACCESS_FINE/COARSE_LOCATION); nunca ACCESS_BACKGROUND_LOCATION: sigue con la pantalla apagada porque corre como
     servicio en primer plano de tipo «location» (TLRutaServicio) con el aviso fijo «Compartiendo tu ubicación con {negocio} y el cliente ·
     Entrega #{num}» (§1c). En Android 13+ pide también mostrar ese aviso (si dice que no, el servicio sigue y el sistema lo lista en el
     administrador de tareas).
   - Las posiciones van SOLO al servidor de la cáscara (plugins.TLRuta.servidor en capacitor.config.json, generado desde apps.json), nunca a una
     dirección que mande la página (guardián rutaSoloNuestroServidor). Única excepción: en un build depurable (los de prueba del CI) el humo del
     emulador puede apuntar a su simulador en 10.0.2.2 o 127.0.0.1 (servidorPrueba); un build de tienda no es depurable y la ignora.
   Métodos: empezar, detener, estado, permiso (lib/nativo/ruta.ts y lib/nativo/permisos.ts). */
@CapacitorPlugin(
    name = "TLRuta",
    permissions = {
        @Permission(alias = "ubicacion", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "aviso", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class TLRutaPlugin extends Plugin {

    private String servidor() {
        String s = getConfig().getString("servidor", "");
        return s == null ? "" : s.replaceAll("/+$", "");
    }

    private boolean depurable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    /* Solo para el humo del CI en un build depurable: el simulador en la máquina del emulador. */
    private String servidorDe(PluginCall call) {
        String prueba = call.getString("servidorPrueba", null);
        if (prueba != null && depurable()) {
            Uri u = Uri.parse(prueba);
            String h = u.getHost();
            if ("http".equals(u.getScheme()) && h != null && (h.equals("10.0.2.2") || h.equals("127.0.0.1")) && u.getPort() > 0) return "http://" + h + ":" + u.getPort();
        }
        return servidor();
    }

    private static boolean valido(String token, String entrega) {
        return token != null && token.matches("^[A-Za-z0-9_-]{43}$") && entrega != null && entrega.matches("^\\d{1,12}$");
    }

    @PluginMethod
    public void empezar(PluginCall call) {
        if (!valido(call.getString("token"), call.getString("entrega"))) { call.reject("token o entrega no válidos"); return; }
        if (servidorDe(call).isEmpty()) { call.reject("sin servidor"); return; }
        if (getPermissionState("ubicacion") != PermissionState.GRANTED) { requestPermissionForAlias("ubicacion", call, "trasUbicacion"); return; }
        pedirAvisoOArrancar(call);
    }

    @PermissionCallback
    private void trasUbicacion(PluginCall call) {
        if (getPermissionState("ubicacion") != PermissionState.GRANTED) { JSObject r = new JSObject(); r.put("estado", "negado"); call.resolve(r); return; }
        pedirAvisoOArrancar(call);
    }

    private void pedirAvisoOArrancar(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("aviso") != PermissionState.GRANTED && !call.getBoolean("avisoPedido", false)) {
            call.getData().put("avisoPedido", true);
            requestPermissionForAlias("aviso", call, "trasAviso");
            return;
        }
        arrancar(call);
    }

    @PermissionCallback
    private void trasAviso(PluginCall call) { arrancar(call); } // con o sin el aviso visible, el servicio corre

    private void arrancar(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, TLRutaServicio.class);
        i.putExtra("servidor", servidorDe(call));
        i.putExtra("rotulo", getConfig().getString("rotulo", ""));
        i.putExtra("token", call.getString("token"));
        i.putExtra("entrega", call.getString("entrega"));
        String negocio = call.getString("negocio", "");
        i.putExtra("negocio", negocio == null ? "" : negocio.substring(0, Math.min(80, negocio.length())));
        i.putExtra("cadaS", Math.max(5, Math.min(60, call.getInt("cadaS", 10))));
        i.putExtra("minM", Math.max(5, Math.min(200, call.getInt("minM", 25))));
        try {
            ContextCompat.startForegroundService(ctx, i);
            JSObject r = new JSObject(); r.put("estado", "ok"); call.resolve(r);
        } catch (Exception e) {
            call.reject("no se pudo empezar: " + e.getClass().getSimpleName());
        }
    }

    @PluginMethod
    public void detener(PluginCall call) {
        TLRutaServicio.detener(getContext());
        call.resolve();
    }

    @PluginMethod
    public void estado(PluginCall call) {
        JSObject r = new JSObject();
        r.put("activo", TLRutaServicio.activo);
        if (TLRutaServicio.entrega != null) r.put("entrega", TLRutaServicio.entrega);
        r.put("pendientes", TLRutaServicio.pendientes);
        if (TLRutaServicio.ultimaEnviada > 0) r.put("ultimaEnviada", TLRutaServicio.ultimaEnviada);
        r.put("sinSenal", TLRutaServicio.sinSenal);
        call.resolve(r);
    }

    @PluginMethod
    public void permiso(PluginCall call) {
        PermissionState p = getPermissionState("ubicacion");
        JSObject r = new JSObject();
        r.put("estado", p == PermissionState.GRANTED ? "concedido" : p == PermissionState.DENIED ? "negado" : "preguntar");
        call.resolve(r);
    }
}
