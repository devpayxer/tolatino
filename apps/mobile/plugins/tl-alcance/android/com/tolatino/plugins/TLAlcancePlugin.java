package com.tolatino.plugins;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/* 8a · TLAlcance (fase8-apps.md §3.1 «Alcance de navegación»; guardián cascaraSoloSuAlcance): el filtro NATIVO de navegación de cada
   cáscara. Sin métodos para la web: solo decide, en cada navegación del marco principal, si la ruta es de ESTA app. Lee su alcance de
   capacitor.config.json (plugins.TLAlcance, generado desde apps.json: el mismo que aplica el servidor en apps/web/lib/app-nativa-comun.ts).
   - Nuestro servidor y ruta común, técnica, de inicio o propia → la cáscara la abre.
   - Nuestro servidor y ruta de otra app o del Super Admin → fuera (el sistema la abre en esa app si está instalada, o en el navegador).
   - Otro origen: Capacitor ya lo manda fuera (allowNavigation solo trae nuestro dominio). El origen local (islas) → la cáscara. */
@CapacitorPlugin(name = "TLAlcance")
public class TLAlcancePlugin extends Plugin {

    private String host = "";
    private String[] comunes = new String[0], inicio = new String[0], propias = new String[0], ajenas = new String[0];

    private static String[] lista(JSONObject o, String k) {
        JSONArray a = o.optJSONArray(k);
        if (a == null) return new String[0];
        String[] r = new String[a.length()];
        for (int i = 0; i < a.length(); i++) r[i] = a.optString(i, "");
        return r;
    }

    @Override
    public void load() {
        try {
            JSONObject c = getConfig().getConfigJSON();
            host = c.optString("host", "");
            comunes = lista(c, "comunes");
            inicio = lista(c, "inicio");
            propias = lista(c, "propias");
            ajenas = lista(c, "ajenas");
        } catch (Exception e) { /* sin configuración: no decide nada */ }
    }

    private static boolean bajo(String ruta, String p) {
        return p.equals("/") || ruta.equals(p) || ruta.startsWith(p + "/");
    }

    private static boolean alguna(String ruta, String[] L) {
        for (String p : L) if (bajo(ruta, p)) return true;
        return false;
    }

    /* ¿La abre esta app? (el mismo orden que duenoDe(): común y técnica, inicio exacto, lo de otra app, lo propio). */
    boolean enAlcance(String ruta) {
        if (alguna(ruta, comunes)) return true;
        for (String p : inicio) if (ruta.equals(p)) return true;
        if (alguna(ruta, ajenas)) return false;
        return alguna(ruta, propias);
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (host.isEmpty() || url == null || url.getHost() == null) return null;
        String h = url.getPort() > 0 ? url.getHost() + ":" + url.getPort() : url.getHost();
        if (!h.equalsIgnoreCase(host)) return null; // otro origen o el local: lo decide Capacitor
        String ruta = url.getPath() == null || url.getPath().isEmpty() ? "/" : url.getPath();
        if (enAlcance(ruta)) return null; // es de esta app: la abre la cáscara
        Intent i = new Intent(Intent.ACTION_VIEW, url);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); } catch (Exception e) { /* sin navegador: se queda */ }
        return true;
    }
}
