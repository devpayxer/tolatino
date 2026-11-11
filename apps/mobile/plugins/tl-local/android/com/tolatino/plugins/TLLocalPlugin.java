package com.tolatino.plugins;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/* 8a · TLLocal (fase8-apps.md §3.4): el almacén cifrado del teléfono para lo que tiene que funcionar sin señal (el paquete firmado de la
   Puerta y su cola, los QR de Mis boletos, la cola del Repartidor). Lo usa apps/web/lib/nativo/almacen.ts.
   - La llave: AES-256 en el Android Keystore (no sale del hardware seguro; no se puede exportar).
   - Los datos: un archivo por fila, cifrado con AES-GCM (iv al azar de 12 bytes), en noBackupFilesDir (fuera de la copia en la nube y del
     traspaso a otro teléfono). Nombre del archivo = sha256 de la clave (la clave no queda a la vista).
   - borrar({ns}): al salir de la cuenta. Borrar la app borra los archivos y la llave del Keystore.
   Métodos: poner, leer, quitar, todos, borrar (los mismos que el iOS). */
@CapacitorPlugin(name = "TLLocal")
public class TLLocalPlugin extends Plugin {

    private static final String ALIAS = "tl_local_v1";
    private static final String NOMBRE = "^[a-z0-9-]{1,40}$";

    private SecretKey llave() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(
            new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .build()
        );
        return kg.generateKey();
    }

    private File dir(String ns, String tienda) throws Exception {
        if (!ns.matches(NOMBRE) || (tienda != null && !tienda.matches(NOMBRE))) throw new IllegalArgumentException("nombre");
        File d = new File(getContext().getNoBackupFilesDir(), "tl-local/" + ns + (tienda == null ? "" : "/" + tienda));
        if (tienda != null && !d.exists() && !d.mkdirs()) throw new IllegalStateException("dir");
        return d;
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x));
        return s.toString();
    }

    private File archivo(String ns, String tienda, String clave) throws Exception {
        byte[] h = MessageDigest.getInstance("SHA-256").digest(clave.getBytes(StandardCharsets.UTF_8));
        return new File(dir(ns, tienda), hex(h) + ".bin");
    }

    private byte[] leerArchivo(File f) throws Exception {
        try (FileInputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private String abrir(File f) throws Exception {
        byte[] b = leerArchivo(f);
        if (b.length < 13) throw new IllegalStateException("dañado");
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, llave(), new GCMParameterSpec(128, b, 0, 12));
        return new String(c.doFinal(b, 12, b.length - 12), StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void poner(PluginCall call) {
        try {
            String valor = call.getString("valor", "");
            if (valor.length() > 4_000_000) { call.reject("demasiado grande"); return; }
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, llave());
            byte[] iv = c.getIV(), ct = c.doFinal(valor.getBytes(StandardCharsets.UTF_8));
            File f = archivo(call.getString("ns", ""), call.getString("tienda", ""), call.getString("clave", ""));
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(iv); out.write(ct); out.getFD().sync(); }
            if (!tmp.renameTo(f)) throw new IllegalStateException("renombrar");
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo guardar.", e);
        }
    }

    @PluginMethod
    public void leer(PluginCall call) {
        try {
            File f = archivo(call.getString("ns", ""), call.getString("tienda", ""), call.getString("clave", ""));
            JSObject r = new JSObject();
            r.put("valor", f.exists() ? abrir(f) : null);
            call.resolve(r);
        } catch (Exception e) {
            JSObject r = new JSObject();
            r.put("valor", null); // dañado o de otra llave: como si no estuviera
            call.resolve(r);
        }
    }

    @PluginMethod
    public void quitar(PluginCall call) {
        try {
            File f = archivo(call.getString("ns", ""), call.getString("tienda", ""), call.getString("clave", ""));
            if (f.exists() && !f.delete()) throw new IllegalStateException("borrar");
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo quitar.", e);
        }
    }

    @PluginMethod
    public void todos(PluginCall call) {
        JSArray valores = new JSArray();
        try {
            File[] L = dir(call.getString("ns", ""), call.getString("tienda", "")).listFiles();
            if (L != null) for (File f : L) {
                if (!f.getName().endsWith(".bin")) continue;
                try { valores.put(abrir(f)); } catch (Exception e) { /* dañado: fuera */ }
            }
        } catch (Exception e) { /* sin nada */ }
        JSObject r = new JSObject();
        r.put("valores", valores);
        call.resolve(r);
    }

    private static void borrarDir(File d) {
        File[] L = d.listFiles();
        if (L != null) for (File f : L) { if (f.isDirectory()) borrarDir(f); else f.delete(); }
        d.delete();
    }

    @PluginMethod
    public void borrar(PluginCall call) {
        try {
            borrarDir(dir(call.getString("ns", ""), null));
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo borrar.", e);
        }
    }
}
