import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const vscode = acquireVsCodeApi ();

class X3DPreview
{
   #browser = X3D .getBrowser ();
   #localStorage = this .#browser .getLocalStorage () .addNameSpace ("VSCodePreview.");
   #toolbar;

   constructor ()
   {
      this .#localStorage .setDefaultValues ({
         toolbarVisible: true,
         toolbarRevealed: true,
      });

      this .redirectConsoleMessages ();
      this .updateToolbar ();
      this .#browser .getContextMenu () .setUserMenu (() => this .createUserMenu ());

      window .addEventListener ("storage", () => this .updateToolbar ());
      window .addEventListener ("message", event => this .receiveMessage (event));

      window .open = url => this .openLinkInExternalBrowser (url);
   }

   updateToolbar ()
   {
      this .#toolbar ??= $("<div></div>")
         .addClass ("toolbar")
         .appendTo ($("body"));

      const
         browser      = this .#browser,
         toolbar      = this .#toolbar,
         localStorage = this .#localStorage;

      toolbar .empty ();

      const playButton = $("<button></button>")
         .attr ("title", "Toggle browser update on/off.")
         .addClass (["fa-solid", "fa-play"])
         .addClass (browser .isLive () ? "selected" : "unselected")
         .on ("click", () =>
         {
            if (browser .isLive ())
               browser .endUpdate ();
            else
               browser .beginUpdate ();
         })
         .appendTo (toolbar);

      browser .getLive () .addFieldCallback ("preview", () =>
      {
         playButton
            .removeClass ("selected")
            .addClass (browser .isLive () ? "selected" : "unselected");
      });

      $("<span></span>") .addClass ("dot") .appendTo (toolbar);

      $("<button></button>")
         .attr ("title", "View all objects in scene.")
         .addClass (["fa-solid", "fa-arrows-to-dot"])
         .on ("click", () =>
         {
            browser .viewAll ();
         })
         .appendTo (toolbar);

      const grip = $("<button></button>")
         .attr ("title", "Reveal/Conceal Toolbar.")
         .addClass (["fa-solid", "fa-grip-lines-vertical", "grip"])
         .on ("click", () =>
         {
            if (localStorage .toolbarRevealed)
               toolbar .animate ({ left: -(toolbar .width () - grip .width ()) });
            else
               toolbar .animate ({ left: -4 });

            localStorage .toolbarRevealed = !localStorage .toolbarRevealed;
         })
         .appendTo (toolbar);

      const updateToolbarPosition = () =>
      {
         if (localStorage .toolbarRevealed)
            toolbar .css ({ left: -4 });
         else
            toolbar .css ({ left: -(toolbar .width () - grip .width ()) });
      };

      updateToolbarPosition ();

      if (!toolbar .observer)
      {
         toolbar .observer = new ResizeObserver (updateToolbarPosition);

         toolbar .observer .disconnect ();
         toolbar .observer .observe (toolbar [0], { childList: true });
      }

      if (!localStorage .toolbarVisible)
         toolbar .hide ();
   }

   createUserMenu ()
   {
      const
         toolbar      = this .#toolbar,
         localStorage = this .#localStorage;

      return {
         toolbar: {
            name: "Show Toolbar",
            type: "checkbox",
            selected: localStorage .toolbarVisible,
            events: {
               click: () =>
               {
                  if (localStorage .toolbarVisible)
                     toolbar .fadeOut ();
                  else
                     toolbar .fadeIn ();

                  localStorage .toolbarVisible = !localStorage .toolbarVisible;
               },
            },
         },
      };
   }

   receiveMessage ({ data })
   {
      switch (data .command)
      {
         case "update":
         {
            this .updateToolbar ();
            break;
         }
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
