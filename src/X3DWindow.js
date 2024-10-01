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
      console .log (this .isX_ITE ());

      vscode .commands .executeCommand ("setContext", "x3dFileActive", this .isX_ITE ());
   }

   isX_ITE ()
   {
      const textEditor = vscode .window .activeTextEditor;

      switch (textEditor .document .languageId)
      {
         case "X3D":
         case "wavefront-obj":
         {
            return true;
         }
         case "xml":
         {
            const text = textEditor .document .getText () ;

            if (text .includes ("<X3D"))
               return true;

            if (text .includes ("<svg"))
               return true;

            return false;
         }
         case "json":
         {
            const text = textEditor .document .getText () ;

            if (text .match (/^\s*{\s*"X3D"\s*:/s))
               return true;

            switch (path .extname (textEditor .document .fileName))
            {
               case ".x3dj":
               case ".gltf":
                  return true;
            }

            return false;
         }
         case "plaintext":
         {
            switch (path .extname (textEditor .document .fileName))
            {
               case ".x3d":
               case ".x3dv":
               case ".x3dj":
               case ".wrl":
               case ".vrml":
               case ".obj":
               case ".ply":
               case ".svg":
                  return true;
            }

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
