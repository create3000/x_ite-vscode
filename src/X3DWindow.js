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
      vscode .commands .executeCommand ("setContext", "x3dFileActive", this .isX3D ());
   }

   isX3D ()
   {
      const textEditor = vscode .window .activeTextEditor;

      switch (textEditor .document .languageId)
      {
         case "X3D":
         {
            return true;
         }
         case "xml":
         {
            if (textEditor .document .getText () .match (/<!DOCTYPE\s+X3D/s))
               return true;

            return false;
         }
         case "json":
         {
            if (textEditor .document .getText () .match (/^\s*{\s*"X3D"\s*:/s))
               return true;

            return false;
         }
         default:
         {
            return false;
         }
      }
   }
}

module .exports = X3DWindow;
