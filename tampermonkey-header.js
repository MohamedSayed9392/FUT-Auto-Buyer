module.exports = {
  headers: {
    name: "FUT Auto Buyer [Edited]",
    namespace: "http://tampermonkey.net/",
    version: "1.5.0 [Edited]",
    description: "FUT Auto Buyer",
    author: "CK Algos",
    match: [
      "https://www.ea.com/*/fifa/ultimate-team/web-app/*",
      "https://www.ea.com/fifa/ultimate-team/web-app/*",
    ],
    grant: ["GM_xmlhttpRequest"],
    connect: [
      "ea.com",
      "ea2.com",
      "futbin.com",
      "futwiz.com",
      "discordapp.com",
      "futbin.org",
      "exp.host",
    ],
    require: [
      "https://code.jquery.com/jquery-3.6.1.min.js",
      "https://raw.githubusercontent.com/MohamedSayed9392/FUT-Auto-Buyer/main/external/discord.11.4.2.min.js",
      "https://greasyfork.org/scripts/47911-font-awesome-all-js/code/Font-awesome%20AllJs.js?version=275337",
      "https://github.com/MohamedSayed9392/fut-trade-enhancer/releases/latest/download/fut-trade-enhancer.user.js",
    ],
    updateURL:
      "https://github.com/MohamedSayed9392/fut-auto-buyer/releases/latest/download/fut-auto-buyer.user.js",
    downloadURL:
      "https://github.com/MohamedSayed9392/fut-auto-buyer/releases/latest/download/fut-auto-buyer.user.js",
    noFrame: true,
  },
};
