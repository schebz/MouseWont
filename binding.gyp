{
  "targets": [
    {
      "target_name": "mouse_math",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "native/cpp/mouse_math_napi.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "."
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": ["/arch:AVX2"]
            }
          }
        }],
        ["OS=='mac' or OS=='linux'", {
          "cflags": ["-msse3", "-mavx2", "-std=c++17"],
          "cflags_cc": ["-msse3", "-mavx2", "-std=c++17"]
        }]
      ],
      "xcode_settings": {
        "OTHER_CFLAGS": ["-msse3", "-mavx2", "-std=c++17"],
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
      },
      "product_dir": "native/bin/cpp"
    }
  ]
}