const
   vscode = require ("vscode"),
   path   = require ("path"),
   fs     = require ("fs");

class X3DPreview
{
   #context;
   #panels = new Map ();

   constructor (context)
   {
      this .#context = context;
   }

   openPanel (textEditor)
   {
      const
         filePath = textEditor .document .fileName,
         content  = textEditor .document .getText ();

      const panel = this .#panels .get (filePath)
         ?? this .createPanel (textEditor);

      panel .reveal (vscode .ViewColumn .Two);

      this .updatePanel (panel, filePath, content);

      // this .setActivePanel (panel);
   }

   createPanel (textEditor)
   {
      const
         filePath = textEditor .document .fileName,
         basename = path .basename (filePath);

      const localResourceRoots = [
         vscode .Uri .file (this .#context .extensionPath),
         vscode .Uri .file (path .dirname (filePath)),
      ];

      const panel = vscode .window .createWebviewPanel ("x3d.preview", "X3D Preview", vscode .ViewColumn .Two,
      {
         enableScripts: true,
         retainContextWhenHidden: true,
         localResourceRoots: localResourceRoots,
      });

      panel .title         = `X3D Preview [${basename}]`;
      panel .textEditor    = textEditor;
      panel .watchers      = [ ];
      panel .webview .html = this .getWebviewContent (panel);

      panel .webview .onDidReceiveMessage (message => this .didReceiveMessage (message), undefined, this .#context .subscriptions);

      panel .onDidDispose (() =>
      {
         this .#panels .delete (filePath);
         this .unwatchFiles (panel);
         // this .updateActivePanel ();
      });

      // panel .onDidChangeViewState (() => this .updateActivePanel ());

      this .#panels .set (filePath, panel);

      return panel;
   }

   updatePanel (panel, filePath)
   {
      const src = panel .webview .asWebviewUri (vscode .Uri .file (filePath));

      panel .webview .postMessage ({ command: "load-url", src: src .toString () });

      this .watchFiles (panel);
   }

   getWebviewContent ()
   {
      return /* html */ `<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <script defer src="https://code.jquery.com/jquery-3.7.1.slim.min.js"></script>
   <script type="module">
import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const browser = X3D .getBrowser ();

browser .getContextMenu () .setUserMenu (() =>
{
   return {
      "browserUpdate": {
         "name": "Browser Update",
         "type": "checkbox",
         "selected": browser .isLive (),
         "events": {
            click: (event) =>
            {
               if ($(event .target) .is (":checked"))
                  browser .beginUpdate ();
               else
                  browser .endUpdate ();
            },
         },
      },
      "viewAll": {
         "name": "View All",
         "callback": () => browser .viewAll (),
      },
   };
});

window .addEventListener ("message", async event =>
{
   const data = event .data;

   switch (data .command)
   {
      case "load-url":
      {
         const
            worldURL        = browser .getWorldURL (),
            activeViewpoint = browser .getActiveViewpoint ();

         if (activeViewpoint)
         {
            var
               positionOffset         = activeViewpoint ._positionOffset .copy (),
               orientationOffset      = activeViewpoint ._orientationOffset .copy (),
               centerOfRotationOffset = activeViewpoint ._centerOfRotationOffset .copy (),
               fieldOfViewScale       = activeViewpoint ._fieldOfViewScale .getValue (),
               nearDistance           = activeViewpoint .nearDistance,
               farDistance            = activeViewpoint .farDistance;
         }

         await browser .loadURL (new X3D .MFString (data .src));

         if (browser .getWorldURL () === worldURL && activeViewpoint && browser .getActiveViewpoint ())
         {
            const activeViewpoint = browser .getActiveViewpoint ();

            activeViewpoint ._positionOffset         = positionOffset;
            activeViewpoint ._orientationOffset      = orientationOffset;
            activeViewpoint ._centerOfRotationOffset = centerOfRotationOffset;
            activeViewpoint ._fieldOfViewScale       = fieldOfViewScale;
            activeViewpoint .nearDistance            = nearDistance,
            activeViewpoint .farDistance             = farDistance;
         }

         break;
      }
   }
});

(() =>
{
   const vscode = acquireVsCodeApi ();

   function output (log, command)
   {
      return function (... args)
      {
         log .apply (this, args);

         vscode .postMessage ({ command, args: args .map (arg => String (arg)) });
      }
   }

   console .log   = output (console .log,   "log");
   console .info  = output (console .info,  "info");
   console .warn  = output (console .warn,  "warn");
   console .error = output (console .error, "error");
   console .debug = output (console .debug, "debug");
})();
   </script>
   <style>
html, body, x3d-canvas {
   margin: 0;
   padding: 0;
   width: 100vw;
   height: 100vh;
}
   </style>
</head>
<body>
   <x3d-canvas
         debug="true"
         splashScreen="false"
         contentScale="auto">
   </x3d-canvas>
</body>
</html>`;
   }

   watchFiles (panel)
   {
      this .unwatchFiles (panel);

      const
         document = panel .textEditor .document,
         filePath = document .fileName,
         watcher  = fs .watch (filePath, () => this .updatePanel (panel, filePath));

      panel .watchers .push (watcher);
   }

   unwatchFiles (panel)
   {
      for (const watcher of panel .watchers)
         watcher .close ();

      panel .watchers .length = 0;
   }

   didReceiveMessage (message)
   {
      switch (message .command)
      {
         case "log":
         case "info":
         case "warn":
         case "error":
         case "debug":
         {
            console [message .command] (... message .args);
            return;
         }
      }
   }
}

module .exports = X3DPreview;
