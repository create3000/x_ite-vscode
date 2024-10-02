const
   X3DPanel = require ("./X3DPanel"),
   vscode   = require ("vscode"),
   path     = require ("path");

class X3DWindow
{
   #preview;

   constructor (context)
   {
      this .#preview = new X3DPanel (context);

      vscode .window .onDidChangeActiveTextEditor (() => setImmediate (() => this .didChangeActiveTextEditor ()));

      this .didChangeActiveTextEditor ();
   }

   get preview ()
   {
      return this .#preview;
   }

   didChangeActiveTextEditor ()
   {
      vscode .commands .executeCommand ("setContext", "x_iteFileActive", this .isX_ITE ());
   }

   isX_ITE ()
   {
      const textEditor = vscode .window .activeTextEditor;

      switch (textEditor ?.document ?.languageId)
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

            return [
               ".x3dj",
               ".gltf",
            ]
            .includes (path .extname (textEditor .document .fileName));
         }
         case "plaintext":
         {
            return [
               ".x3d",
               ".x3dv",
               ".x3dj",
               ".wrl",
               ".vrml",
               ".gltf",
               ".obj",
               ".ply",
               ".svg",
            ]
            .includes (path .extname (textEditor .document .fileName));
         }
         default:
         {
            return false;
         }
      }
   }
}

module .exports = X3DWindow;
