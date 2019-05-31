// Source Chooser Plugin
(function($) {
  $.extend(mejs.MepDefaults, {
    sourcechooserText: ""
  });

  $.extend(MediaElementPlayer.prototype, {
    sources: [],

    buildsourcechooser: function(player, controls, layers, media) {
      var t = this,
        sourceTitle = t.options.sourcechooserText
          ? t.options.sourcechooserText
          : mejs.i18n.t("mejs.source-chooser"),
        hoverTimeout;

      player.sourcechooserButton = $(
        '<div class="mejs-button mejs-sourcechooser-button">' +
          '<button type="button" role="button" aria-haspopup="true" aria-controls="' +
          t.id +
          '" title="' +
          sourceTitle +
          '" aria-label="' +
          sourceTitle +
          '" aria-live="assertive"></button>' +
          '<div class="mejs-sourcechooser-selector mejs-offscreen" role="menu" aria-expanded="false" aria-hidden="true">' +
          "<ul>" +
          "</ul>" +
          "</div>" +
          "</div>"
      )
        .appendTo(controls)

        // hover
        .hover(
          function() {
            clearTimeout(hoverTimeout);
            player.showSourcechooserSelector();
          },
          function() {
            hoverTimeout = setTimeout(function() {
              player.hideSourcechooserSelector();
            }, t.options.menuTimeoutMouseLeave);
          }
        )

        // keyboard menu activation
        .on("keydown", function(e) {
          var keyCode = e.keyCode;
          if (e.target === $(this).find("button")[0]) e.stopPropagation();

          switch (keyCode) {
            case 32: // space
              if (!mejs.MediaFeatures.isFirefox) {
                // space sends the click event in Firefox
                player.showSourcechooserSelector();
              }
              break;
            case 38: // up arrow
            case 13: // enter
              player.showSourcechooserSelector();
              break;
            case 27: // esc
              player.hideSourcechooserSelector();
              $(this)
                .find("button")
                .focus();
              break;
            default:
              return true;
          }
        })

        // close menu when tabbing away
        .on(
          "focusout",
          mejs.Utility.debounce(function(e) {
            // Safari triggers focusout multiple times
            // Firefox does NOT support e.relatedTarget to see which element
            // just lost focus, so wait to find the next focused element
            setTimeout(function() {
              var parent = $(document.activeElement).closest(
                ".mejs-sourcechooser-selector"
              );
              if (!parent.length) {
                // focus is outside the control; close menu
                player.hideSourcechooserSelector();
              }
            }, 0);
          }, 100)
        )

        // handle clicks to the source radio buttons
        .delegate("input[type=radio]", "click", function() {
          // set aria states
          $(this)
            .attr("aria-selected", true)
            .attr("checked", "checked");
          $(this)
            .closest(".mejs-sourcechooser-selector")
            .find("input[type=radio]")
            .not(this)
            .attr("aria-selected", "false")
            .removeAttr("checked");

          var src = this.value;

          if (media.currentSrc != src) {
            var currentTime = media.currentTime;
            var paused = media.paused;
            media.pause();
            media.setSrc(src);

            media.addEventListener(
              "loadedmetadata",
              function(e) {
                media.currentTime = currentTime;
              },
              true
            );

            var canPlayAfterSourceSwitchHandler = function(e) {
              if (!paused) {
                media.play();
              }
              media.removeEventListener(
                "canplay",
                canPlayAfterSourceSwitchHandler,
                true
              );
            };
            media.addEventListener(
              "canplay",
              canPlayAfterSourceSwitchHandler,
              true
            );
            media.load();
          }

          t.setSourcechooserAriaLabel(media);
        })

        // Handle click so that screen readers can toggle the menu
        .delegate("button", "click", function(e) {
          if (
            $(this)
              .siblings(".mejs-sourcechooser-selector")
              .hasClass("mejs-offscreen")
          ) {
            player.showSourcechooserSelector();
          } else {
            player.hideSourcechooserSelector();
          }
        });

      // add to list
      for (var i in this.node.children) {
        var src = this.node.children[i];
        if (
          src.nodeName === "SOURCE" &&
          (media.canPlayType(src.type) == "probably" ||
            media.canPlayType(src.type) == "maybe")
        ) {
          t.sources.push(src);
          player.addSourceButton(
            src.src,
            src.title,
            src.type,
            media.src == src.src
          );
        }
      }

      t.setSourcechooserAriaLabel(media);
    },

    setSourcechooserAriaLabel: function(media) {
      var label = this.options.sourcechooserText
        ? this.options.sourcechooserText
        : mejs.i18n.t("mejs.source-chooser");
      var current = this.currentSource(media);

      if (current) {
        label += ": " + current;
      }

      this.sourcechooserButton
        .find("button")
        .attr("aria-label", label)
        .attr("title", label);
    },

    addSourceButton: function(src, label, type, isCurrent) {
      var t = this;
      if (label === "" || label == undefined) {
        label = src;
      }
      type = type.split("/")[1];

      t.sourcechooserButton
        .find("ul")
        .append(
          $(
            "<li>" +
              '<input type="radio" name="' +
              t.id +
              '_sourcechooser" id="' +
              t.id +
              "_sourcechooser_" +
              label +
              type +
              '" role="menuitemradio" value="' +
              src +
              '" ' +
              (isCurrent ? 'checked="checked"' : "") +
              'aria-selected="' +
              isCurrent +
              '" aria-label="' +
              label +
              '" tabindex="-1" />' +
              '<label for="' +
              t.id +
              "_sourcechooser_" +
              label +
              type +
              '" aria-hidden="true">' +
              label +
              " (" +
              type +
              ")</label>" +
              "</li>"
          )
        );

      t.adjustSourcechooserBox();
    },

    currentSource: function(media) {
      var current = this.sources.filter(function(src) {
        return src.src == media.src;
      })[0];

      if (current) {
        return current.title || "";
      }

      return "";
    },

    adjustSourcechooserBox: function() {
      var t = this;
      // adjust the size of the outer box
      t.sourcechooserButton
        .find(".mejs-sourcechooser-selector")
        .height(
          t.sourcechooserButton
            .find(".mejs-sourcechooser-selector ul")
            .outerHeight(true)
        );
    },

    hideSourcechooserSelector: function() {
      this.sourcechooserButton
        .find(".mejs-sourcechooser-selector")
        .addClass("mejs-offscreen")
        .attr("aria-expanded", "false")
        .attr("aria-hidden", "true")
        .find("input[type=radio]") // make radios not focusable
        .attr("tabindex", "-1");
    },

    showSourcechooserSelector: function() {
      if (
        this.sourcechooserButton
          .find(".mejs-sourcechooser-selector")
          .hasClass("mejs-offscreen")
      ) {
        this.sourcechooserButton
          .find(".mejs-sourcechooser-selector")
          .removeClass("mejs-offscreen")
          .attr("aria-expanded", "true")
          .attr("aria-hidden", "false")
          .find("input[type=radio]")
          .attr("tabindex", "0");
        this.sourcechooserButton
          .find(".mejs-sourcechooser-selector")
          .find("input[type=radio]:checked")
          .first()
          .focus();
      }
    }
  });
})(mejs.$);
