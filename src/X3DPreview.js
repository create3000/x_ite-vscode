import X3D from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";

const vscode = acquireVsCodeApi ();

Object .assign ($,
{
   try (callback, logError = false)
   {
      try
      {
         return callback ();
      }
      catch (error)
      {
         if (logError)
            console .error (error .message);
      }
   },
});

class X3DPreview
{
   #browser = X3D .getBrowser ();
   #localStorage = this .#browser .getLocalStorage () .addNameSpace ("VSCodePreview.");
   #toolbar;
   #background;
   #environmentLight;

   constructor ()
   {
      this .#localStorage .setDefaultValues ({
         toolbarVisible: true,
         toolbarRevealed: true,
         background: false,
         ibl: true,
         environmentImage: "helipad",
         environmentIntensity: 1,
      });

      window .addEventListener ("storage", () => this .updateToolbar ());
      window .addEventListener ("message", event => this .receiveMessage (event));

      window .open = url => this .openLinkInExternalBrowser (url);

      this .redirectConsoleMessages ();
      this .updateToolbar ();
      this .#browser .getContextMenu () .setUserMenu (() => this .createUserMenu ());

      vscode .postMessage ({ command: "loaded" });
   }

   updateToolbar ()
   {
      this .#toolbar ??= $("<div></div>")
         .addClass (["toolbar", "panel"])
         .appendTo ($("body"));

      const
         browser      = this .#browser,
         scene        = browser .currentScene,
         toolbar      = this .#toolbar,
         localStorage = this .#localStorage;

      toolbar .empty ();

      // Play/Pause button

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

      browser .getLive () .addFieldCallback (this, () =>
      {
         playButton
            .removeClass ("selected")
            .addClass (browser .isLive () ? "selected" : "unselected");
      });

      // Background button

      {
         $("<span></span>") .addClass ("dot") .appendTo (toolbar);

         const button = $("<button></button>")
            .attr ("title", "Toggle background on/off.")
            .addClass (["fa-solid", "fa-tree-city"])
            .on ("click", () =>
            {
               localStorage .background = !localStorage .background;

               updateBackground ();
            })
            .appendTo (toolbar);

         const updateBackground = async () =>
         {
            button
               .removeClass (["selected", "unselected"])
               .addClass (localStorage .background ? "selected" : "unselected");

            const background = await this .getBackground ();

            background .set_bind = localStorage .background;
         };

         updateBackground ();
      }

      // EnvironmentLight button

      if (browser .currentScene .encoding === "GLTF")
      {
         $("<span></span>") .addClass ("dot") .appendTo (toolbar);

         const button = $("<button></button>")
            .attr ("title", "Toggle image base lighting on/off.")
            .addClass (["fa-solid", "fa-lightbulb"])
            .on ("click", () =>
            {
               localStorage .ibl = !localStorage .ibl;

               updateEnvironmentLight ();
            })
            .appendTo (toolbar);

         const updateEnvironmentLight = async () =>
         {
            button
               .removeClass (["selected", "unselected"])
               .addClass (localStorage .ibl ? "selected" : "unselected");

            const light = await this .getEnvironmentLight ();

            light .on = localStorage .ibl;
         };

         updateEnvironmentLight ();
      }

      // Animations button

      const animations = $.try (() => scene .getExportedNode ("Animations") .children);

      if (animations ?.length)
      {
         $("<span></span>") .addClass ("dot") .appendTo (toolbar);

         const button = $("<button></button>")
            .attr ("title", "Start/Stop animations.")
            .addClass (["animations", "menu"])
            .appendTo (toolbar);

         const toggleTimeSensor = (timeSensor, isActive = timeSensor .isActive) =>
         {
            if (isActive)
            {
               timeSensor .stopTime = Date .now () / 1000;
            }
            else
            {
               timeSensor .loop      = true;
               timeSensor .startTime = Date .now () / 1000;
            }
         };

         const span = $("<span></span>")
            .addClass (["fa-solid", "fa-play"])
            .on ("click", () =>
            {
               const isActive = animations .some (animation => animation .children [0] .isActive);

               for (const animation of animations)
                  toggleTimeSensor (animation .children [0], isActive);
            })
            .appendTo (button);

         const toggleAll = () =>
         {
            const isActive = animations .some (animation => animation .children [0] .isActive);

            span
               .removeClass (["selected", "unselected"])
               .addClass (isActive ? "selected" : "unselected");
         };

         const list = $("<ul></ul>")
            .addClass ("panel")
            .appendTo (button);

         for (const animation of animations)
         {
            const timeSensor = animation .children [0];

            const li = $("<li></li>") .appendTo (list);

            const icon = $("<i></i>")
               .addClass (["fa-solid", "fa-check"])
               .css ("margin-right", 5);

            const button = $("<button></button>")
               .text (timeSensor .description)
               .prepend (icon)
               .appendTo (li)
               .on ("click", () =>
               {
                  toggleTimeSensor (timeSensor);
               });

            const toggle = () =>
            {
               button
                  .removeClass (["selected", "unselected"])
                  .addClass (timeSensor .isActive ? "selected" : "unselected");

               toggleAll ();
            };

            toggle ();

            timeSensor .getField ("isActive") .addFieldCallback (this, toggle);
         }
      }

      // Animations button

      const materialVariants = $.try (() => scene .getExportedNode ("MaterialVariants"));

      if (materialVariants)
      {
         $("<span></span>") .addClass ("dot") .appendTo (toolbar);

         const button = $("<button></button>")
            .attr ("title", "Select a material variant.")
            .addClass (["menu", "fa-solid", "fa-wand-sparkles"])
            .appendTo (toolbar);

         const list = $("<ul></ul>")
            .addClass ("panel")
            .appendTo (button);

         const entries = [... materialVariants .getValue () .getMetaData ("MaterialVariants/names") .entries ()];

         entries .push ([entries .length, "none"]);

         for (const [i, name] of entries)
         {
            const li = $("<li></li>") .appendTo (list);

            const icon = $("<i></i>")
               .addClass (["fa-solid", "fa-circle"])
               .css ("margin-right", 5);

            const button = $("<button></button>")
               .text (name)
               .prepend (icon)
               .appendTo (li)
               .on ("click", () =>
               {
                  materialVariants .whichChoice = i;

                  selectVariant ();
               });
         }

         const selectVariant = () =>
         {
            const
               buttons = list .find ("button"),
               button  = $(buttons [materialVariants .whichChoice]);

            buttons .find (">:first-child") .removeClass ("fa-circle-dot") .addClass ("fa-circle");
            buttons .removeClass ("selected") .addClass ("unselected");
            button .find (">:first-child") .removeClass ("fa-circle") .addClass ("fa-circle-dot");
            button .removeClass ("unselected") .addClass ("selected");
         };

         materialVariants .getField ("whichChoice") .addFieldCallback (this, selectVariant);

         selectVariant ();
      }

      // View All button

      $("<span></span>") .addClass ("dot") .appendTo (toolbar);

      $("<button></button>")
         .attr ("title", "View all objects in scene.")
         .addClass (["fa-solid", "fa-arrows-to-dot"])
         .on ("click", () =>
         {
            browser .viewAll ();
         })
         .appendTo (toolbar);

      // Reveal/Conceal button

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

      toolbar .observer ?.disconnect ();
      toolbar .observer = new ResizeObserver (() => updateToolbarPosition ());
      toolbar .observer .observe (toolbar [0]);

      if (localStorage .toolbarVisible)
         toolbar .show ();
      else
         toolbar .hide ();
   }

   createUserMenu ()
   {
      const
         browser      = this .#browser,
         scene        = browser .currentScene,
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
         ... browser .getActiveNavigationInfo () ?
         {
            headlight: {
               name: "Headlight",
               type: "checkbox",
               selected: browser .getActiveNavigationInfo () ._headlight .getValue (),
               events: {
                  click: () =>
                  {
                     const navigationInfo = browser .getActiveNavigationInfo ();

                     if (!navigationInfo)
                        return;

                     navigationInfo ._headlight = !navigationInfo ._headlight .getValue ();
                  },
               },
            },
         }
         : { },
         ... scene .encoding === "GLTF" ?
         {
            ibl: {
               name: "Environment Image",
               items: {
                  cannon: {
                     name: "Cannon Exterior",
                     type: "radio",
                     selected: localStorage .environmentImage === "cannon-exterior",
                     events: {
                        click: () => this .setEnvironmentImage ("cannon-exterior", 2) ,
                     },
                  },
                  helipad: {
                     name: "Helipad Goldenhour",
                     type: "radio",
                     selected: localStorage .environmentImage === "helipad",
                     events: {
                        click: () => this .setEnvironmentImage ("helipad", 1),
                     },
                  },
                  footprint: {
                     name: "Footprint Court",
                     type: "radio",
                     selected: localStorage .environmentImage === "footprint-court",
                     events: {
                        click: () => this .setEnvironmentImage ("footprint-court", 1),
                     },
                  },
               },
            },
         }
         : { },
      };
   }

   async getBackground ()
   {
      const
         browser = this .#browser,
         scene   = browser .currentScene;

      if (!this .#background)
      {
         const background = scene .createNode ("Background");

         background .skyAngle    = [0.8, 1.3, 1.4, 1.5708];
         background .skyColor    = [0.21, 0.31, 0.59, 0.33, 0.45, 0.7, 0.57, 0.66, 0.85, 0.6, 0.73, 0.89, 0.7, 0.83, 0.98];
         background .groundAngle = [0.659972, 1.2, 1.39912, 1.5708];
         background .groundColor = [0.105712, 0.156051, 0.297, 0.187629, 0.255857, 0.398, 0.33604, 0.405546, 0.542, 0.3612, 0.469145, 0.602, 0.39471, 0.522059, 0.669];

         this .#background = background;
      }

      scene .addRootNode (this .#background);

      return this .#background;
   }

   async getEnvironmentLight ()
   {
      const
         browser      = this .#browser,
         scene        = browser .currentScene,
         localStorage = this .#localStorage;

      try
      {
         const group = scene .getExportedNode ("EnvironmentLights");

         return group .children [0];
      }
      catch
      { }

      if (!this .#environmentLight)
      {

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

         environmentLight .color           = new X3D .SFColor (1, 1, 1);
         environmentLight .diffuseTexture  = diffuseTexture;
         environmentLight .specularTexture = specularTexture;

         this .#environmentLight = environmentLight;

         this .setEnvironmentImage (localStorage .environmentImage, localStorage .environmentIntensity);
      }

      scene .addRootNode (this .#environmentLight);

      return this .#environmentLight;
   }

   setEnvironmentImage (name, intensity)
   {
      const
         url              = new URL (`images/${name}`, import .meta .url),
         diffuseURL       = new X3D .MFString (`${url}-diffuse.avif`),
         specularURL      = new X3D .MFString (`${url}-specular.avif`),
         environmentLight = this .#environmentLight,
         localStorage     = this .#localStorage;

      environmentLight .intensity            = intensity;
      environmentLight .diffuseTexture  .url = diffuseURL;
      environmentLight .specularTexture .url = specularURL;

      localStorage .environmentIntensity = intensity;
      localStorage .environmentImage     = name;
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
