import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const vscode = acquireVsCodeApi ();

class X3DPreview
{
   #browser = X3D .getBrowser ();

   constructor ()
   {
      this .redirectConsoleMessages ();

      this .#browser .getContextMenu () .setUserMenu (() => this .createUserMenu ());

      this .createToolbar ();

      window .addEventListener ("message", event => this .receiveMessage (event));

      window .open = url => this .openLinkInExternalBrowser (url);
   }

   createUserMenu ()
   {
      const browser = this .#browser;

      return {
         browserUpdate: {
            name: "Browser Update",
            type: "checkbox",
            selected: browser .isLive (),
            events: {
               click: (event) =>
               {
                  if ($(event .target) .is (":checked"))
                     browser .beginUpdate ();
                  else
                     browser .endUpdate ();
               },
            },
         },
         viewAll: {
            name: "View All",
            callback: () => browser .viewAll (),
         },
      };
   }

   #toolbar;

   createToolbar ()
   {
      this .#toolbar = $("<div></div>")
         .addClass ("toolbar")
         .appendTo ($("body"));
   }

   receiveMessage ({ data })
   {
      switch (data .command)
      {
         case "load-url":
         {
            this .loadURL (data .src);
            break;
         }
      }
   }

   async loadURL (src)
   {
      const
         browser         = this .#browser,
         worldURL        = browser .getWorldURL (),
         activeViewpoint = browser .getActiveViewpoint ();

      if (activeViewpoint)
      {
         var
            positionOffset         = activeViewpoint ._positionOffset .copy (),
            orientationOffset      = activeViewpoint ._orientationOffset .copy (),
            centerOfRotationOffset = activeViewpoint ._centerOfRotationOffset .copy (),
            fieldOfViewScale       = activeViewpoint ._fieldOfViewScale .getValue (),
            nearDistance           = activeViewpoint .nearDistance,
            farDistance            = activeViewpoint .farDistance;
      }

      await browser .loadURL (new X3D .MFString (src));

      if (browser .getWorldURL () === worldURL && activeViewpoint && browser .getActiveViewpoint ())
      {
         const activeViewpoint = browser .getActiveViewpoint ();

         activeViewpoint ._positionOffset         = positionOffset;
         activeViewpoint ._orientationOffset      = orientationOffset;
         activeViewpoint ._centerOfRotationOffset = centerOfRotationOffset;
         activeViewpoint ._fieldOfViewScale       = fieldOfViewScale;
         activeViewpoint .nearDistance            = nearDistance,
         activeViewpoint .farDistance             = farDistance;
      }
   }

   openLinkInExternalBrowser (url)
   {
      vscode .postMessage ({ command: "open-link", url });
   }

   redirectConsoleMessages ()
   {
      function output (log, command)
      {
         return function (... args)
         {
            log .apply (this, args);

            vscode .postMessage ({ command, args: args .map (String) });
         };
      }

      console .log   = output (console .log,   "log");
      console .info  = output (console .info,  "info");
      console .warn  = output (console .warn,  "warn");
      console .error = output (console .error, "error");
      console .debug = output (console .debug, "debug");
   }
}

export default X3DPreview;
