/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return (
      registry[uri] ||
      new Promise((resolve) => {
        if ("document" in self) {
          const script = document.createElement("script");
          script.src = uri;
          script.onload = resolve;
          document.head.appendChild(script);
        } else {
          nextDefineUri = uri;
          importScripts(uri);
          resolve();
        }
      }).then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.addEventListener("push", function (event) {
    let data = { title: "Notificación", body: "Recibiste un mensaje." };

    if (event.data) {
      // Si hay datos en el payload, los usamos.
      data = event.data.json();
    }

    const options = {
      body: data.body,
      icon: data.icon || "/public/favicon.png", // Usa un icono de tu PWA
      data: {
        url: data.url || "/", // URL de destino al hacer clic
      },
    };

    // Muestra la notificación al usuario
    event.waitUntil(self.registration.showNotification(data.title, options));
  });

  // Escuchador opcional para manejar el clic en la notificación
  self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const clickData = event.notification.data;

    // Abre la ventana de la PWA y navega a la URL especificada
    event.waitUntil(clients.openWindow(clickData.url || "/"));
  });

  self.define = (depsNames, factory) => {
    const uri =
      nextDefineUri ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = (depUri) => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require,
    };
    registry[uri] = Promise.all(
      depsNames.map((depName) => specialDeps[depName] || require(depName))
    ).then((deps) => {
      factory(...deps);
      return exports;
    });
  };
}
define(["./workbox-9dc17825"], function (workbox) {
  "use strict";

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute(
    [
      {
        url: "registerSW.js",
        revision: "3ca0b8505b4bec776b69afdba2768812",
      },
      {
        url: "index.html",
        revision: "0.73q8hbftrkg",
      },
    ],
    {}
  );
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(
    new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
      allowlist: [/^\/$/],
    })
  );
  workbox.registerRoute(
    /^https:\/\/.*\.js$/,
    new workbox.NetworkFirst({
      cacheName: "js-cache",
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 86400,
        }),
      ],
    }),
    "GET"
  );
  workbox.registerRoute(
    /^https:\/\/.*\.css$/,
    new workbox.NetworkFirst({
      cacheName: "css-cache",
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 86400,
        }),
      ],
    }),
    "GET"
  );
  workbox.registerRoute(
    /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|ico)$/,
    new workbox.CacheFirst({
      cacheName: "image-cache",
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 604800,
        }),
      ],
    }),
    "GET"
  );
  workbox.registerRoute(
    /^https:\/\/.*\/api\//,
    new workbox.NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 3600,
        }),
      ],
    }),
    "GET"
  );
});
