const
   vscode = require ("vscode"),
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
      ];

      const panel = vscode .window .createWebviewPanel ("x3d.preview", "X3D Preview", vscode .ViewColumn .Two,
      {
         enableScripts: true,
         retainContextWhenHidden: true,
         localResourceRoots: localResourceRoots,
      });

      panel .title      = `X3D Preview [${basename}]`;
      panel .watchers   = [ ];
      panel .textEditor = textEditor;

      // panel .onDidDispose (() =>
      // {
      //    this .unwatchFiles (panel);
      //    this .#panels .delete (filePath);
      //    this .updateActivePanel ();
      // });

      // panel .onDidChangeViewState (() => this .updateActivePanel ());

      this .#panels .set (filePath, panel);

      return panel;
   }

   updatePanel (panel, filePath, content)
   {
      // const basename = path .basename (filePath);

      // panel .webview .html = this .formatHtml (panel, content, basename) .replace(/\${webview.cspSource}/g, panel .webview .cspSource);

      // panel .webview .onDidReceiveMessage (message => this .onDidReceiveMessage (panel, message));

      // this .watchFiles (panel);
   }
}

module .exports = X3DPreview;
