const
   vscode = require ("vscode"),
   path   = require ("path"),
   fs     = require ("fs");

class X3DPanel
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

   getWebviewContent (panel)
   {
      const script = panel .webview .asWebviewUri (vscode .Uri .file (path .resolve (__dirname, "preview.js")));

      return /* html */ `<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <script defer src="https://code.jquery.com/jquery-3.7.1.slim.min.js"></script>
   <script type="module" src="${script}"></script>
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

module .exports = X3DPanel;
