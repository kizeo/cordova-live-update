module.exports = {
    "plugins": ["prettier"],
    "extends": ["plugin:react/recommended", "standard", "prettier",],
    "parser": "babel-eslint",
    "rules": {
        "prettier/prettier": "error"
    },
    "globals": {
        "NODE_ENV": true,
        "LIVEUPDATE": true,
        "cordova": true,
        "confirm": true,
        "alert": true,
        "localStorage": true,
    }
};