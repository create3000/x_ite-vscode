import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const vscode = acquireVsCodeApi ();

class X3DPreview
{
   #browser = X3D .getBrowser ();
   #localStorage = this .#browser .getLocalStorage () .addNameSpace ("VSCodePreview.");
   #toolbar;
   #environmentLight;

   constructor ()
   {
      this .#localStorage .setDefaultValues ({
         toolbarVisible: true,
         toolbarRevealed: true,
         ibl: true,
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

      if (browser .currentScene .encoding === "GLTF")
      {
         $("<span></span>") .addClass ("dot") .appendTo (toolbar);

         const light = this .getEnvironmentLight ();

         const button = $("<button></button>")
            .attr ("title", "Toggle image base lighting on/off.")
            .addClass (["fa-regular", "fa-lightbulb"])
            .on ("click", () =>
            {
               localStorage .ibl = !localStorage .ibl;

               updateEnvironmentLight ();
            })
            .appendTo (toolbar);

         const updateEnvironmentLight = () =>
         {
            button
               .removeClass (["selected", "unselected"])
               .addClass (localStorage .ibl ? "selected" : "unselected");

            light .then (light => light .on = localStorage .ibl);
         };

         updateEnvironmentLight ();
      }

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
            localStorage .toolbarRevealed = !localStorage .toolbarRevealed;

            updateToolbarPosition ("animate");
         })
         .appendTo (toolbar);

      const updateToolbarPosition = (action = "css") =>
      {
         if (localStorage .toolbarRevealed)
            toolbar [action] ({ left: -4 });
         else
            toolbar [action] ({ left: -(toolbar .width () - grip .width ()) });
      };

      updateToolbarPosition ();

      if (!toolbar .observer)
      {
         toolbar .observer = new ResizeObserver (updateToolbarPosition);

         toolbar .observer .disconnect ();
         toolbar .observer .observe (toolbar [0], { childList: true });
      }

      if (localStorage .toolbarVisible)
         toolbar .show ();
      else
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

   async getEnvironmentLight ()
   {
      if (!this .#environmentLight)
      {
         const
            browser = this .#browser,
            scene   = browser .currentScene;

         scene .addComponent (browser .getComponent ("CubeMapTexturing"));

         await browser .loadComponents (scene);

         const
            environmentLight  = scene .createNode ("EnvironmentLight"),
            diffuseTexture    = scene .createNode ("ImageCubeMapTexture"),
            specularTexture   = scene .createNode ("ImageCubeMapTexture"),
            textureProperties = scene .createNode ("TextureProperties");

         textureProperties .generateMipMaps     = true;
         textureProperties .minificationFilter  = "NICEST";
         textureProperties .magnificationFilter = "NICEST";

         diffuseTexture  .textureProperties = textureProperties;
         specularTexture .textureProperties = textureProperties;

         environmentLight .intensity       = 1;
         environmentLight .color           = new X3D .SFColor (1, 1, 1);
         environmentLight .diffuseTexture  = diffuseTexture;
         environmentLight .specularTexture = specularTexture;

         const
            url         = new URL (`images/helipad`, import .meta .url),
            diffuseURL  = new X3D .MFString (`${url}-diffuse.avif`),
            specularURL = new X3D .MFString (`${url}-specular.avif`);

         diffuseTexture  .url = diffuseURL;
         specularTexture .url = specularURL;

         scene .addRootNode (environmentLight);

         this.#environmentLight = environmentLight;
      }

      return this .#environmentLight;
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

      this .updateToolbar ();
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
