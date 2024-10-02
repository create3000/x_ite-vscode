const
   vscode = require ("vscode"),
   path   = require ("path");

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
      panel .watchers      = [ ];
      panel .textEditor    = textEditor;
      panel .webview .html = this .getWebviewContent (panel);

      panel .onDidDispose (() =>
      {
         this .#panels .delete (filePath);
         // this .unwatchFiles (panel);
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
   }

   getWebviewContent ()
   {
      return /* html */ `<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <script type="module">
import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const browser = X3D .getBrowser ();

browser .getContextMenu () .setUserMenu (() =>
{
   return {
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
            activeViewpoint .nearDistance            = nearDistance,
            activeViewpoint .farDistance             = farDistance;
         }

         break;
      }
   }
});
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
}

module .exports = X3DPreview;
