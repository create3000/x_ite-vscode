const
   vscode = require ("vscode"),
   path   = require ("path"),
   fs     = require ("fs");

class X3DPanel
{
   #context;
   #panels = new Map ();
   #outputChannel = vscode .window .createOutputChannel ("X_ITE", { log: true });

   constructor (context)
   {
      this .#context              = context;
      this .#outputChannel .log   = this .#outputChannel .appendLine;
      this .#outputChannel .debug = this .#outputChannel .appendLine;
   }

   openPreview (textEditor)
   {
      const
         filePath = textEditor .document .fileName,
         content  = textEditor .document .getText ();

      const
         exists = this .#panels .has (filePath),
         panel  = this .#panels .get (filePath) ?? this .createPanel (textEditor);

      panel .reveal (vscode .ViewColumn .Two);

      this .watchFiles (panel);

      if (exists)
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

      panel .webview .onDidReceiveMessage (message => this .didReceiveMessage (panel, message), undefined, this .#context .subscriptions);

      panel .onDidDispose (() =>
      {
         this .#panels .delete (filePath);
         this .unwatchFiles (panel);
         // this .updateActivePanel ();
      });

      panel .onDidChangeViewState (() => panel .webview .postMessage ({ command: "update" }));

      this .#panels .set (filePath, panel);

      return panel;
   }

   updatePanel (panel)
   {
      const
         filePath = panel .textEditor .document .fileName,
         src      = panel .webview .asWebviewUri (vscode .Uri .file (filePath));

      panel .webview .postMessage ({ command: "load-url", src: src .toString () });
   }

   getWebviewContent (panel)
   {
      const
         script = panel .webview .asWebviewUri (vscode .Uri .file (path .join (__dirname, "preview.js"))),
         css    = panel .webview .asWebviewUri (vscode .Uri .file (path .join (__dirname, "preview.css"))),
         src    = panel .webview .asWebviewUri (vscode .Uri .file (panel .textEditor .document .fileName,));

      return /* html */ `<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <script defer src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
   <script type="module" src="${script}"></script>
   <link rel="stylesheet" href="${css}">
</head>
<body>
   <x3d-canvas
         debug="true"
         cache="false"
         splashScreen="false"
         contentScale="auto"
         src="${src}">
   </x3d-canvas>
   <div id="console" title="Console"></div>
</body>
</html>`;
   }

   watchFiles (panel)
   {
      this .unwatchFiles (panel);

      const
         filePath = panel .textEditor .document .fileName,
         watcher  = fs .watch (filePath, () => this .updatePanel (panel, filePath));

      panel .watchers .push (watcher);
   }

   unwatchFiles (panel)
   {
      for (const watcher of panel .watchers)
         watcher .close ();

      panel .watchers .length = 0;
   }

   excludes = [
      /AbortError:\s*signal is aborted/,
      /Couldn't load URL .*vscode-resource/,
   ];

   didReceiveMessage (panel, message)
   {
      switch (message .command)
      {
         case "open-link":
         {
            const uri = vscode .Uri .parse (message .url);

            vscode .commands .executeCommand ("vscode.open", uri);
            break;
         }
         case "log":
         case "info":
         case "warn":
         case "error":
         case "debug":
         {
            const text = message .args .join (" ");

            if (this .excludes .some (exclude => exclude .test (text)))
               break;

            console [message .command] (... message .args);
            this .#outputChannel [message .command] (text);

            // forward errors back to the webview so the preview can display them
            panel .webview .postMessage ({ command: "console-message", level: message .command, text });

            break;
         }
      }
   }
}

module .exports = X3DPanel;
