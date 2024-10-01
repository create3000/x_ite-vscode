const
   X3DPreview = require ("./X3DPreview"),
   vscode     = require ("vscode"),
   path       = require ("path");

class X3DWindow
{
   #preview;

   constructor (context)
   {
      this .#preview = new X3DPreview (context);

      vscode .window .onDidChangeActiveTextEditor (() => setImmediate (() => this .didChangeActiveTextEditor ()));

      this .didChangeActiveTextEditor ();
   }

   get preview ()
   {
      return this .#preview;
   }

   didChangeActiveTextEditor ()
   {
      vscode .commands .executeCommand ("setContext", "x3dFileActive", this .isX_ITE ());
   }

   isX_ITE ()
   {
      const textEditor = vscode .window .activeTextEditor;

      console .log (textEditor .document .languageId)

      switch (textEditor .document .languageId)
      {
         case "X3D":
         case "wavefront-obj":
         {
            return true;
         }
         case "xml":
         {
            if (textEditor .document .getText () .includes ("<X3D"))
               return true;

            if (textEditor .document .getText () .includes ("<svg"))
               return true;

            return false;
         }
         case "json":
         {
            if (textEditor .document .getText () .match (/^\s*{\s*"X3D"\s*:/s))
               return true;

            return false;
         }
         case "plaintext":
         default:
         {
            return false;
         }
      }
   }
}

module .exports = X3DWindow;
