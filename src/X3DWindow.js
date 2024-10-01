const
   X3DPreview = require ("./X3DPreview"),
   vscode     = require ("vscode");

class X3DWindow
{
   #preview;

   constructor (context)
   {
      this .#preview = new X3DPreview (context);

      vscode .window .onDidChangeActiveTextEditor (() => setImmediate (() => this .update ()));

      setImmediate (() => this .update ());
   }

   get preview ()
   {
      return this .#preview;
   }

   update ()
   {
      const isX3D = vscode .window .activeTextEditor .document .languageId === "X3D";

      console .log (vscode .window .activeTextEditor .document .languageId, isX3D)

      vscode .commands .executeCommand ("setContext", "x3dFileActive", isX3D);
   }
}

module .exports = X3DWindow;
