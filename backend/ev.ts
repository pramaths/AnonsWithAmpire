/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ev.json`.
 */
export type Ev = {
  "address": "5V11nhm8AMcC8nn1VmyjqXvwLms5pGJVdVSco7FsahwX",
  "metadata": {
    "name": "ev",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "approvePlatformAccess",
      "discriminator": [
        56,
        225,
        112,
        33,
        213,
        137,
        207,
        9
      ],
      "accounts": [
        {
          "name": "driverAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "driver"
              }
            ]
          }
        },
        {
          "name": "platformState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "platformAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "driverTokenAccount",
          "writable": true
        },
        {
          "name": "driver",
          "writable": true,
          "signer": true,
          "relations": [
            "driverAccount"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "active",
          "type": "bool"
        },
        {
          "name": "delegateAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyPoints",
      "discriminator": [
        47,
        45,
        184,
        163,
        57,
        214,
        221,
        104
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "driverAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "driver"
              }
            ]
          }
        },
        {
          "name": "platformState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "platformAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "driver",
          "writable": true,
          "relations": [
            "driverAccount"
          ]
        },
        {
          "name": "driverTokenAccount",
          "writable": true
        },
        {
          "name": "buyerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "solPayment",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "platformState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u64"
        }
      ]
    },
    {
      "name": "recordSession",
      "discriminator": [
        101,
        213,
        185,
        49,
        190,
        189,
        113,
        180
      ],
      "accounts": [
        {
          "name": "platformState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "driverAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "driver"
              }
            ]
          }
        },
        {
          "name": "session",
          "writable": true,
          "signer": true
        },
        {
          "name": "driver",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "platformState"
          ]
        },
        {
          "name": "driverTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "driver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "chargerCode",
          "type": "string"
        },
        {
          "name": "energyUsed",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerDriver",
      "discriminator": [
        111,
        15,
        228,
        191,
        92,
        150,
        88,
        27
      ],
      "accounts": [
        {
          "name": "driverAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "driverPubkey"
              }
            ]
          }
        },
        {
          "name": "platformState"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platformState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "driverPubkey",
          "type": "pubkey"
        },
        {
          "name": "pricePerPoint",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "chargingSession",
      "discriminator": [
        167,
        37,
        9,
        198,
        108,
        160,
        43,
        64
      ]
    },
    {
      "name": "driverAccount",
      "discriminator": [
        200,
        153,
        71,
        1,
        45,
        108,
        45,
        203
      ]
    },
    {
      "name": "platformState",
      "discriminator": [
        160,
        10,
        182,
        134,
        98,
        122,
        78,
        239
      ]
    }
  ],
  "events": [
    {
      "name": "sessionRecorded",
      "discriminator": [
        58,
        73,
        117,
        145,
        216,
        208,
        191,
        204
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "driverNotActive",
      "msg": "Driver has not approved platform access for selling points"
    },
    {
      "code": 6001,
      "name": "noDelegation",
      "msg": "Driver has not delegated authority to platform"
    },
    {
      "code": 6002,
      "name": "invalidPlatformAuthority",
      "msg": "Invalid platform authority"
    }
  ],
  "types": [
    {
      "name": "chargingSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "driver",
            "type": "pubkey"
          },
          {
            "name": "chargerCode",
            "type": "string"
          },
          {
            "name": "energyUsed",
            "type": "u64"
          },
          {
            "name": "pointsEarned",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "driverAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "driver",
            "type": "pubkey"
          },
          {
            "name": "totalEnergy",
            "type": "u64"
          },
          {
            "name": "totalPoints",
            "type": "u64"
          },
          {
            "name": "sessionCount",
            "type": "u64"
          },
          {
            "name": "pointsBalance",
            "type": "u64"
          },
          {
            "name": "pricePerPoint",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "platformState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "totalSessions",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "sessionRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "driver",
            "type": "pubkey"
          },
          {
            "name": "chargerCode",
            "type": "string"
          },
          {
            "name": "energyUsed",
            "type": "u64"
          },
          {
            "name": "points",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
