#!/usr/bin/env node
/* 8a · Genera lo nativo de las cuatro cáscaras desde apps/mobile/apps.json (fase8-apps.md §3.1; guardián appsUnaFuente).
   Uso:
     node apps/mobile/scripts/generar.mjs              escribe los archivos generados (los que se guardan en el repo)
     node apps/mobile/scripts/generar.mjs --verificar  no escribe: falla si algún archivo del repo no es lo que sale de apps.json
     node apps/mobile/scripts/generar.mjs --preparar   además copia las islas (www/) y genera íconos y splash (no van al repo)
   Variables (solo para --preparar / builds): TOLATINO_URL (el servidor; por defecto el del sabor), SABOR (pruebas | produccion), TL_BUILD.
   Lo que sale al repo usa SIEMPRE el servidor de pruebas de apps.json (así --verificar no depende del entorno). Ningún secreto aquí. */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { token } from "./tokens.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const A = JSON.parse(readFileSync(join(RAIZ, "apps.json"), "utf8"));
const verificar = process.argv.includes("--verificar"), preparar = process.argv.includes("--preparar");
const SABOR = preparar ? (process.env.SABOR || "pruebas") : "pruebas";
if (SABOR === "produccion" && process.env.TL_PRODUCCION !== "fase9") { console.error("✗ el sabor produccion no se genera antes de la Fase 9"); process.exit(2); }
const URL_BASE = (preparar && process.env.TOLATINO_URL ? process.env.TOLATINO_URL : A.servidor[SABOR]).replace(/\/$/, "");
const BUILD = preparar ? Number(process.env.TL_BUILD || 1) : 1;
if (!Number.isInteger(BUILD) || BUILD < 1) { console.error("✗ TL_BUILD es un entero ≥ 1"); process.exit(2); }
const HOST = new URL(URL_BASE).host, HTTP = URL_BASE.startsWith("http://");

/* ── Lo que se deriva de apps.json ── */
const PLUGINS = {
  App: { ios: "AppPlugin", android: "com.capacitorjs.plugins.app.AppPlugin", npm: "@capacitor/app", spm: "CapacitorApp", gradle: "capacitor-app" },
  AppLauncher: { ios: "AppLauncherPlugin", android: "com.capacitorjs.plugins.applauncher.AppLauncherPlugin", npm: "@capacitor/app-launcher", spm: "CapacitorAppLauncher", gradle: "capacitor-app-launcher" },
  // 8e · La háptica de lo que confirma y la hoja de compartir del sistema (oficiales de Capacitor, MIT; versiones fijas en package.json).
  Haptics: { ios: "HapticsPlugin", android: "com.capacitorjs.plugins.haptics.HapticsPlugin", npm: "@capacitor/haptics", spm: "CapacitorHaptics", gradle: "capacitor-haptics" },
  Share: { ios: "SharePlugin", android: "com.capacitorjs.plugins.share.SharePlugin", npm: "@capacitor/share", spm: "CapacitorShare", gradle: "capacitor-share" },
  PushNotifications: { ios: "PushNotificationsPlugin", android: "com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin", npm: "@capacitor/push-notifications", spm: "CapacitorPushNotifications", gradle: "capacitor-push-notifications" },
  SplashScreen: { ios: "SplashScreenPlugin", android: "com.capacitorjs.plugins.splashscreen.SplashScreenPlugin", npm: "@capacitor/splash-screen", spm: "CapacitorSplashScreen", gradle: "capacitor-splash-screen" },
  StatusBar: { ios: "StatusBarPlugin", android: "com.capacitorjs.plugins.statusbar.StatusBarPlugin", npm: "@capacitor/status-bar", spm: "CapacitorStatusBar", gradle: "capacitor-status-bar" },
  TLAlcance: { ios: "TLAlcancePlugin", android: "com.tolatino.plugins.TLAlcancePlugin", dir: "tl-alcance" },
  TLLocal: { ios: "TLLocalPlugin", android: "com.tolatino.plugins.TLLocalPlugin", dir: "tl-local" },
  TLPantalla: { ios: "TLPantallaPlugin", android: "com.tolatino.plugins.TLPantallaPlugin", dir: "tl-pantalla" },
  TLReporte: { ios: "TLReportePlugin", android: "com.tolatino.plugins.TLReportePlugin", dir: "tl-reporte" },
  // 8e · La ubicación del Repartidor durante una entrega (servicio en primer plano en Android; modo de fondo de ubicación en iOS).
  TLRuta: { ios: "TLRutaPlugin", android: "com.tolatino.plugins.TLRutaPlugin", dir: "tl-ruta" },
  // 8d · Llaves de acceso con la API del sistema (iOS: AuthenticationServices; Android: Credential Manager, versión fija de androidx.credentials).
  TLLlave: { ios: "TLLlavePlugin", android: "com.tolatino.plugins.TLLlavePlugin", dir: "tl-llave", maven: ["androidx.credentials:credentials:1.5.0", "androidx.credentials:credentials-play-services-auth:1.5.0"] },
};
const rotulo = (a, plat) => `TLApp/${a.key}/${plat}/${A.version} (${BUILD})`;
/* El alcance que aplica el filtro nativo (TLAlcance): el mismo que el servidor (apps/web/lib/app-nativa-comun.ts). */
function alcance(a) {
  const otras = A.apps.filter((x) => x.key !== a.key && !x.alcance.includes("/")).flatMap((x) => x.alcance);
  return {
    host: HOST,
    comunes: [...A.comun, ...A.tecnico],
    inicio: A.inicio,
    propias: a.alcance,
    ajenas: [...(a.alcance.includes("/") ? otras : []), ...A.soloWeb],
  };
}
/* La entrada de cada app, distinta por plataforma (guardián puenteSoloNuestroOrigen):
   - Android: server.url es SOLO el origen y la entrada va en server.appStartPath. Capacitor usa server.url tal cual como regla de origen de
     addWebMessageListener; con una ruta (/panel) la regla es inválida, la llamada falla y Capacitor cae en silencio a addJavascriptInterface,
     que entrega el puente a TODOS los marcos, también a un iframe de otro origen (11 nov: Negocios, Repartidor y Puerta en el emulador).
   - iOS: la entrada va en server.url. En iOS appStartPath es un archivo LOCAL (public/{entrada}): si no existe, Capacitor cierra la app. */
function capConfig(a, plat) {
  const ent = a.entrada === "/" ? "" : a.entrada;
  const server = plat === "android"
    ? { url: URL_BASE, ...(ent ? { appStartPath: ent } : {}) }
    : { url: `${URL_BASE}${ent}` };
  return {
    appId: a.ios,
    appName: a.nombre.es,
    webDir: "public",
    loggingBehavior: SABOR === "pruebas" ? "debug" : "none",
    server: { ...server, hostname: "localhost", androidScheme: "https", iosScheme: "capacitor", errorPath: "index.html", allowNavigation: [HOST], cleartext: HTTP },
    ios: { appendUserAgent: rotulo(a, "ios"), contentInset: "never", scrollEnabled: true, allowsLinkPreview: false, webContentsDebuggingEnabled: SABOR === "pruebas", limitsNavigationsToAppBoundDomains: false },
    android: { appendUserAgent: rotulo(a, "android"), allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: SABOR === "pruebas", useLegacyBridge: false },
    plugins: {
      SplashScreen: { launchShowDuration: A.splashMaxMs, launchAutoHide: true, backgroundColor: token("--tl-paper"), showSpinner: false, androidScaleType: "CENTER_CROP" },
      TLAlcance: alcance(a),
      // 8e · La ruta del Repartidor: el nativo manda las posiciones SOLO a este servidor (el de la cáscara), nunca a una dirección de la página.
      ...(a.plugins.includes("TLRuta") ? { TLRuta: { servidor: URL_BASE, rotulo: rotulo(a, plat) } } : {}),
      // 8d · Las llaves solo para el dominio de la cáscara (RP ID = el host del servidor, sin puerto) y solo cuando 8b las encienda (apps.json llaves.activas).
      ...(a.plugins.includes("TLLlave") ? { TLLlave: { rpId: new URL(URL_BASE).hostname, activas: A.llaves.activas === true && !HTTP } } : {}),
      // 8c · Avisos: con la app abierta también se ven (banner, sonido, globo). El token sale de APNs (iOS) o FCM (Android); ver lib/nativo/avisos.ts.
      ...(a.plugins.includes("PushNotifications") ? { PushNotifications: { presentationOptions: ["badge", "sound", "alert"] } } : {}),
    },
    packageClassList: a.plugins.map((p) => PLUGINS[p].ios),
  };
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escStr = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const escAndroid = (s) => esc(s).replace(/'/g, "\\'");
const PERM_IOS = { camara: "NSCameraUsageDescription", ubicacion: "NSLocationWhenInUseUsageDescription" };
const permisos = (a) => [...(a.permisos.camara ? ["camara"] : []), ...(a.permisos.ubicacion !== "no" ? ["ubicacion"] : [])];
const texto = (p, a, l) => { const t = A.textos[p]?.[a.key]; if (!t) throw new Error(`apps.json: falta el texto de ${p} para ${a.key}`); return t[l]; };

const salidas = new Map(); // ruta relativa a apps/mobile → contenido
const poner = (r, c) => salidas.set(r, c.endsWith("\n") ? c : c + "\n");

for (const a of A.apps) {
  const cfg = JSON.stringify(capConfig(a, "ios"), null, 2), cfgA = JSON.stringify(capConfig(a, "android"), null, 2);
  const T = `ios/Targets/${a.target}`, S = `android/app/src/${a.sabor}`;
  /* iOS */
  poner(`${T}/capacitor.config.json`, cfg);
  const ps = permisos(a);
  poner(`${T}/Info.plist`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Generado por apps/mobile/scripts/generar.mjs desde apps.json. No editar a mano. -->
<plist version="1.0">
<dict>
	<key>CAPACITOR_DEBUG</key>
	<string>$(CAPACITOR_DEBUG)</string>
	<key>CFBundleDevelopmentRegion</key>
	<string>es</string>
	<key>CFBundleLocalizations</key>
	<array>
		<string>es</string>
		<string>en</string>
	</array>
	<key>CFBundleDisplayName</key>
	<string>${esc(a.nombre.es)}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
	<key>LSRequiresIPhoneOS</key>
	<true/>
${ps.map((p) => `	<key>${PERM_IOS[p]}</key>\n	<string>${esc(texto(p, a, "es"))}</string>`).join("\n")}${ps.length ? "\n" : ""}${a.permisos.ubicacion === "entrega" ? `	<key>UIBackgroundModes</key>
	<array>
		<string>location</string>
	</array>
` : ""}	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
		<key>UISceneConfigurations</key>
		<dict>
			<key>UIWindowSceneSessionRoleApplication</key>
			<array>
				<dict>
					<key>UISceneConfigurationName</key>
					<string>Default Configuration</string>
					<key>UISceneDelegateClassName</key>
					<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
				</dict>
			</array>
		</dict>
	</dict>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<true/>
	<key>WKAppBoundDomains</key>
	<array>
		<string>${esc(HOST)}</string>
	</array>
</dict>
</plist>`);
  for (const l of ["es", "en"]) poner(`${T}/${l}.lproj/InfoPlist.strings`, `/* Generado por apps/mobile/scripts/generar.mjs desde apps.json (textos de permiso de fase8-apps.md §1c). No editar a mano. */
"CFBundleDisplayName" = "${escStr(a.nombre[l])}";
${ps.map((p) => `"${PERM_IOS[p]}" = "${escStr(texto(p, a, l))}";`).join("\n")}`);
  // Sin rastreo (§3.6): ni dominios de rastreo ni datos para rastrear. Razones de las API: UserDefaults (CA92.1: datos de la propia app).
  // Los tipos de datos recogidos salen del inventario real en 8i (apps/mobile/inventario-datos.json).
  poner(`${T}/PrivacyInfo.xcprivacy`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Generado por apps/mobile/scripts/generar.mjs. No editar a mano. -->
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>`);
  /* Android */
  poner(`${S}/assets/capacitor.config.json`, cfgA);
  poner(`${S}/assets/capacitor.plugins.json`, JSON.stringify(a.plugins.map((p) => ({ pkg: PLUGINS[p].npm ?? `tolatino/${PLUGINS[p].dir}`, classpath: PLUGINS[p].android })), null, 2));
  // Los permisos normales de las cuatro (androidComun: ACCESS_NETWORK_STATE, la red para la WebView) y después los de esta app.
  const avisos = a.plugins.includes("PushNotifications");
  // 8e · Repartidor («entrega»): ubicación «mientras se usa» (nunca ACCESS_BACKGROUND_LOCATION) + el servicio en primer plano de tipo ubicación
  // (TLRutaServicio) con su aviso fijo; sigue con la pantalla apagada porque es un servicio en primer plano, no un permiso «siempre».
  // Háptica: VIBRATE (normal, sin aviso) solo en la app que lleva el plugin; lo declara también el plugin, aquí se ve.
  const entrega = a.permisos.ubicacion === "entrega";
  const permA = [...(A.androidComun ?? []), ...(a.permisos.camara ? ["android.permission.CAMERA"] : []), ...(a.permisos.ubicacion === "al_usar" || entrega ? ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"] : []),
    ...(entrega ? ["android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_LOCATION"] : []), ...(avisos ? ["android.permission.POST_NOTIFICATIONS"] : []), ...(a.plugins.includes("Haptics") ? ["android.permission.VIBRATE"] : [])];
  const servicio = entrega ? `
        <!-- 8e · La ubicación durante la entrega: servicio en primer plano de tipo «location» con el aviso fijo (§1c). No se exporta. -->
        <service android:name="com.tolatino.plugins.TLRutaServicio" android:exported="false" android:foregroundServiceType="location" />` : "";
  poner(`${S}/AndroidManifest.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por apps/mobile/scripts/generar.mjs desde apps.json: los permisos de ${esc(a.nombre.es)} (solo los que usa). No editar a mano. -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${permA.map((p) => `    <uses-permission android:name="${p}" />`).join("\n")}${permA.length ? "\n" : ""}${a.permisos.camara ? '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' : ""}${avisos ? `    <application android:usesCleartextTraffic="${HTTP ? "true" : "false"}">
        <!-- 8c · Firebase solo para los avisos (FCM): sin token hasta que la persona dice que sí, y sin analítica de Firebase. -->
        <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />
        <meta-data android:name="firebase_analytics_collection_deactivated" android:value="true" />${servicio}
    </application>` : servicio ? `    <application android:usesCleartextTraffic="${HTTP ? "true" : "false"}">${servicio}
    </application>` : `    <application android:usesCleartextTraffic="${HTTP ? "true" : "false"}" />`}
</manifest>`);
  // Español primero (values/ = el idioma por defecto), inglés en values-en/. Los textos del porqué de cada permiso (§1c), para la explicación
  // nativa y las declaraciones de Google Play.
  for (const [dir, l] of [["values", "es"], ["values-en", "en"]]) poner(`${S}/res/${dir}/strings.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por apps/mobile/scripts/generar.mjs desde apps.json. No editar a mano. -->
<resources>
    <string name="app_name">${escAndroid(a.nombre[l])}</string>
    <string name="title_activity_main">${escAndroid(a.nombre[l])}</string>
    <string name="package_name">${a.android}</string>
    <string name="custom_url_scheme">${a.android}</string>
${ps.map((p) => `    <string name="permiso_${p}">${escAndroid(texto(p, a, l))}</string>`).join("\n")}${ps.length ? "\n" : ""}${a.permisos.ubicacion === "entrega" ? `    <string name="ruta_aviso">${escAndroid(A.rutaAviso[l].replace("{negocio}", "%1$s").replace("{business}", "%1$s").replace("{num}", "%2$s"))}</string>
    <string name="ruta_canal">${escAndroid(l === "es" ? "Ubicación durante la entrega" : "Location during a delivery")}</string>
` : ""}</resources>`);
}

/* iOS: la pantalla de arranque de las cuatro apps (App/ entra en los cuatro targets). Es un storyboard y no la clave UILaunchScreen porque el
   plugin SplashScreen de Capacitor abre UIStoryboard(name: "LaunchScreen") al cargar: sin ese archivo, iOS lanza una excepción y la app se
   cierra al abrir (11 nov, las cuatro en el simulador; guardián cascaraArrancaIos). El color «Splash» y el logo «SplashLogo» salen del
   catálogo de cada target (iconos.mjs); el color de aquí es solo el respaldo del archivo (token --tl-paper). */
{
  const p = token("--tl-paper"), c = (i) => (parseInt(p.slice(i, i + 2), 16) / 255).toFixed(3);
  poner("ios/App/LaunchScreen.storyboard", `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por apps/mobile/scripts/generar.mjs. No editar a mano. -->
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="22505" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="tlA-rr-Vc1">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="22504"/>
        <capability name="Named colors" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="tlA-rr-Esc">
            <objects>
                <viewController id="tlA-rr-Vc1" sceneMemberID="viewController">
                    <imageView key="view" userInteractionEnabled="NO" contentMode="center" image="SplashLogo" id="tlA-rr-Img">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <color key="backgroundColor" name="Splash"/>
                    </imageView>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="tlA-rr-Fr1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="53" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashLogo" width="120" height="120"/>
        <namedColor name="Splash">
            <color red="${c(1)}" green="${c(3)}" blue="${c(5)}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
        </namedColor>
    </resources>
</document>`);
}

/* Gradle: los cuatro sabores, cada uno con solo sus plugins. */
const gradlePlugins = [...new Set(A.apps.flatMap((a) => a.plugins).filter((p) => PLUGINS[p].gradle))];
poner("android/app/sabores.gradle", `// Generado por apps/mobile/scripts/generar.mjs desde apps.json: un sabor por app (decisión B), con su id y SOLO sus plugins. No editar a mano.
android {
    flavorDimensions = ["app"]
    productFlavors {
${A.apps.map((a) => `        ${a.sabor} {
            dimension "app"
            applicationId "${a.android}"
            resValue "string", "tl_rotulo", "${rotulo(a, "android")}"
        }`).join("\n")}
    }
    sourceSets {
${A.apps.map((a) => `        ${a.sabor}.java.srcDirs += [${a.plugins.filter((p) => PLUGINS[p].dir).map((p) => `'../../plugins/${PLUGINS[p].dir}/android'`).join(", ")}]`).join("\n")}
    }
}
dependencies {
${A.apps.flatMap((a) => a.plugins.filter((p) => PLUGINS[p].gradle).map((p) => `    ${a.sabor}Implementation project(':${PLUGINS[p].gradle}')`)).join("\n")}
${A.apps.flatMap((a) => a.plugins.flatMap((p) => (PLUGINS[p].maven ?? []).map((m) => `    ${a.sabor}Implementation "${m}"`))).join("\n")}
}`);
poner("android/capacitor.settings.gradle", `// Generado por apps/mobile/scripts/generar.mjs: Capacitor y los plugins oficiales desde node_modules (versiones fijas en apps/mobile/package.json).
include ':capacitor-android'
project(':capacitor-android').projectDir = new File('../node_modules/@capacitor/android/capacitor')
${gradlePlugins.map((p) => `include ':${PLUGINS[p].gradle}'\nproject(':${PLUGINS[p].gradle}').projectDir = new File('../node_modules/${PLUGINS[p].npm}/android')`).join("\n")}`);

/* Xcode (XcodeGen): un proyecto, cuatro targets, cada uno con sus archivos, su id y SOLO sus plugins. */
const spm = [...new Set(A.apps.flatMap((a) => a.plugins).filter((p) => PLUGINS[p].spm))];
poner("ios/project.yml", `# Generado por apps/mobile/scripts/generar.mjs desde apps.json: un proyecto de Xcode con cuatro targets (decisión B). No editar a mano.
# En la Mac del CI: xcodegen generate --spec apps/mobile/ios/project.yml
name: ToLatino
options:
  bundleIdPrefix: com.tolatino
  deploymentTarget:
    iOS: "${A.minimos.ios}"
  developmentLanguage: es
packages:
  Capacitor:
    url: https://github.com/ionic-team/capacitor-swift-pm.git
    exactVersion: 8.6.0
${spm.map((p) => `  ${PLUGINS[p].spm}:\n    path: ../node_modules/${PLUGINS[p].npm}`).join("\n")}
settings:
  base:
    TARGETED_DEVICE_FAMILY: "1"
    SWIFT_VERSION: "5.0"
    MARKETING_VERSION: "${A.version}"
    CURRENT_PROJECT_VERSION: "${BUILD}"
    CODE_SIGN_STYLE: Automatic
    ENABLE_USER_SCRIPT_SANDBOXING: "YES"
  configs:
    Debug:
      CAPACITOR_DEBUG: "true"
    Release:
      CAPACITOR_DEBUG: "false"
targets:
${A.apps.map((a) => `  ${a.target}:
    type: application
    platform: iOS
    sources:
      - path: App
      - path: Targets/${a.target}
        excludes:
          - public
          - Info.plist
      - path: Targets/${a.target}/public
        type: folder
${a.plugins.filter((p) => PLUGINS[p].dir).map((p) => `      - path: ../plugins/${PLUGINS[p].dir}/ios${p === "TLPantalla" ? `\n      - path: ../plugins/tl-pantalla/${a.permisos.camara ? "ios-camara" : "ios-sin-camara"}` : ""}`).join("\n")}
${a.plugins.includes("PushNotifications") ? `    entitlements:
      path: Targets/${a.target}/${a.target}.entitlements
      properties:
        aps-environment: development
` : ""}    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: ${a.ios}
        PRODUCT_NAME: ${a.target}
        INFOPLIST_FILE: Targets/${a.target}/Info.plist
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
    dependencies:
      - package: Capacitor
        product: Capacitor
      - package: Capacitor
        product: Cordova
${a.plugins.filter((p) => PLUGINS[p].spm).map((p) => `      - package: ${PLUGINS[p].spm}`).join("\n")}`).join("\n")}
schemes:
${A.apps.map((a) => `  ${a.target}:
    build:
      targets:
        ${a.target}: all
    run:
      config: Debug`).join("\n")}`);

/* ── Escribir o verificar ── */
let mal = 0;
for (const [r, c] of salidas) {
  const f = join(RAIZ, r);
  if (verificar) {
    const ya = existsSync(f) ? readFileSync(f, "utf8") : null;
    if (ya !== c) { console.error(`✗ ${r} no es lo que sale de apps.json (corre: node apps/mobile/scripts/generar.mjs)`); mal++; }
  } else { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c); }
}
if (verificar) {
  if (mal) process.exit(1);
  console.log(`✓ ${salidas.size} archivos de las cáscaras coinciden con apps.json`);
} else console.log(`✓ ${salidas.size} archivos generados desde apps.json (${SABOR}, ${URL_BASE})`);

/* ── Preparar un build: islas, íconos y splash (no van al repo) ── */
if (preparar) {
  const www = join(RAIZ, "www");
  if (!existsSync(join(www, "comun"))) { console.error("✗ faltan las islas: corre antes node apps/mobile/scripts/islas.mjs (después de next build)"); process.exit(1); }
  for (const a of A.apps) {
    for (const dest of [join(RAIZ, `android/app/src/${a.sabor}/assets/public`), join(RAIZ, `ios/Targets/${a.target}/public`)]) {
      rmSync(dest, { recursive: true, force: true });
      cpSync(join(www, "comun"), dest, { recursive: true });
      writeFileSync(join(dest, "app.json"), JSON.stringify({ app: a.key, url: URL_BASE, entrada: a.entrada, islas: a.islas }));
    }
  }
  await (await import("./iconos.mjs")).iconos(A, RAIZ);
  const h = createHash("sha256");
  for (const f of readdirSync(join(www, "comun"), { recursive: true }).map(String).sort()) { const p = join(www, "comun", f); try { h.update(f); h.update(readFileSync(p)); } catch { /* carpeta */ } }
  console.log(`✓ islas copiadas en los 8 destinos (huella ${h.digest("hex").slice(0, 12)}) e íconos generados`);
}
