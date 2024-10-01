const
   vscode = require ("vscode"),
   url    = require ("url"),
   path   = require ("path");

class X3DPreview
{
   #context;
   #panels = new Map ();

   constructor (context)
   {
      console .log ("Constructed preview.");

      this .#context = context;
   }

   openPanel (textEditor)
   {
      console .log ("Called openPanel.");

      const
         filePath = textEditor .document .fileName,
         content  = textEditor .document .getText ();

      const panel = this .#panels .get (filePath)
         ?? this .createPanel (textEditor);

      this .updatePanel (panel, filePath, content);

      panel .reveal (vscode .ViewColumn .Two);

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
         // this .unwatchFiles (panel);
         this .#panels .delete (filePath);
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

   getWebviewContent (panel)
   {
      return /* html */ `<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <script type="module">
import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const Browser = X3D .getBrowser ();

Browser .getContextMenu () .setUserMenu (() =>
{
   return {
      "viewAll": {
         "name": "View All",
         "callback": () => Browser .viewAll (),
      },
   };
});

window .addEventListener ("message", event =>
{
   const data = event .data;

   switch (data .command)
   {
      case "load-url":
      {
         Browser .loadURL (new X3D .MFString (data .src));
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
