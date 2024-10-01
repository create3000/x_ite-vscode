const X3DPreview = require ("./X3DPreview")

class X3DWindow
{
   #preview;

   constructor (context)
   {
      this .#preview = new X3DPreview (context);
   }

   get preview ()
   {
      return this .#preview;
   }
}

module .exports = X3DWindow;
