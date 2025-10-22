/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solranch_anchor.json`.
 */
export type SolranchAnchor = {
  "address": "9eFLjxiANcZ7ifkQRHZjcFeWhZcTWm67oUg1u1GSDeGx",
  "metadata": {
    "name": "solranchAnchor",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "purchaseAnimal",
      "discriminator": [
        89,
        99,
        227,
        216,
        198,
        202,
        251,
        222
      ],
      "accounts": [
        {
          "name": "animal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  99,
                  104,
                  95,
                  97,
                  110,
                  105,
                  109,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "animal.origin_ranch",
                "account": "animal"
              },
              {
                "kind": "account",
                "path": "animal.id",
                "account": "animal"
              }
            ]
          }
        },
        {
          "name": "owner",
          "docs": [
            "This is secure because we checke the condition `has_one = owner` in the 'animal' account."
          ],
          "writable": true,
          "relations": [
            "animal"
          ]
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerAnimal",
      "discriminator": [
        67,
        60,
        146,
        72,
        179,
        196,
        238,
        64
      ],
      "accounts": [
        {
          "name": "animal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  99,
                  104,
                  95,
                  97,
                  110,
                  105,
                  109,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "ranchProfile"
              },
              {
                "kind": "account",
                "path": "ranch_profile.animal_count",
                "account": "ranchProfile"
              }
            ]
          }
        },
        {
          "name": "verifierProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  105,
                  102,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "verifier"
              }
            ]
          }
        },
        {
          "name": "ranchProfile",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "ranchProfile"
          ]
        },
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "idChip",
          "type": "string"
        },
        {
          "name": "specie",
          "type": "string"
        },
        {
          "name": "breed",
          "type": "string"
        },
        {
          "name": "birthDate",
          "type": "i64"
        }
      ]
    },
    {
      "name": "registerRanch",
      "discriminator": [
        20,
        63,
        239,
        253,
        233,
        78,
        247,
        187
      ],
      "accounts": [
        {
          "name": "ranchProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "country",
          "type": {
            "defined": {
              "name": "country"
            }
          }
        }
      ]
    },
    {
      "name": "registerVerifier",
      "discriminator": [
        67,
        234,
        172,
        169,
        184,
        188,
        145,
        156
      ],
      "accounts": [
        {
          "name": "verifierProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  105,
                  102,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "verifierAuthority"
              }
            ]
          }
        },
        {
          "name": "superAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "verifierAuthority",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "setAllowedAnimalBuyer",
      "discriminator": [
        173,
        6,
        132,
        81,
        45,
        23,
        239,
        99
      ],
      "accounts": [
        {
          "name": "animal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  99,
                  104,
                  95,
                  97,
                  110,
                  105,
                  109,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "originRanch"
              },
              {
                "kind": "account",
                "path": "animal.id",
                "account": "animal"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "animal"
          ]
        },
        {
          "name": "originRanch"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "allowedBuyer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setAnimalPrice",
      "discriminator": [
        196,
        201,
        13,
        66,
        250,
        70,
        215,
        178
      ],
      "accounts": [
        {
          "name": "animal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  99,
                  104,
                  95,
                  97,
                  110,
                  105,
                  109,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "originRanch"
              },
              {
                "kind": "account",
                "path": "animal.id",
                "account": "animal"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "animal"
          ]
        },
        {
          "name": "originRanch"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "verifyRanch",
      "discriminator": [
        19,
        79,
        148,
        131,
        47,
        84,
        255,
        193
      ],
      "accounts": [
        {
          "name": "ranchProfile",
          "writable": true
        },
        {
          "name": "superAuthority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "animal",
      "discriminator": [
        234,
        210,
        108,
        190,
        122,
        133,
        117,
        199
      ]
    },
    {
      "name": "ranchProfile",
      "discriminator": [
        229,
        237,
        65,
        221,
        195,
        67,
        135,
        214
      ]
    },
    {
      "name": "verifierProfile",
      "discriminator": [
        95,
        52,
        82,
        13,
        42,
        25,
        4,
        47
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidVerifierError"
    },
    {
      "code": 6001,
      "name": "inactiveVerifierError"
    },
    {
      "code": 6002,
      "name": "ranchNotVerifiedError"
    },
    {
      "code": 6003,
      "name": "invalidOwnerError"
    },
    {
      "code": 6004,
      "name": "invalidRanchDataError"
    },
    {
      "code": 6005,
      "name": "invalidAnimalDataError"
    },
    {
      "code": 6006,
      "name": "animalNotForSaleError"
    },
    {
      "code": 6007,
      "name": "unauthorizedError"
    },
    {
      "code": 6008,
      "name": "ranchAlreadyVerifiedError"
    }
  ],
  "types": [
    {
      "name": "animal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "originRanch",
            "type": "pubkey"
          },
          {
            "name": "idChip",
            "type": "string"
          },
          {
            "name": "specie",
            "type": "string"
          },
          {
            "name": "breed",
            "type": "string"
          },
          {
            "name": "birthDate",
            "type": "i64"
          },
          {
            "name": "lastSalePrice",
            "type": "u64"
          },
          {
            "name": "salePrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "allowedBuyer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "country",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "other"
          },
          {
            "name": "unitedStates"
          },
          {
            "name": "brazil"
          },
          {
            "name": "argentina"
          },
          {
            "name": "mexico"
          },
          {
            "name": "canada"
          },
          {
            "name": "colombia"
          },
          {
            "name": "uruguay"
          },
          {
            "name": "paraguay"
          },
          {
            "name": "france"
          },
          {
            "name": "germany"
          },
          {
            "name": "unitedKingdom"
          },
          {
            "name": "ireland"
          },
          {
            "name": "spain"
          },
          {
            "name": "italy"
          },
          {
            "name": "poland"
          },
          {
            "name": "netherlands"
          },
          {
            "name": "russia"
          },
          {
            "name": "china"
          },
          {
            "name": "india"
          },
          {
            "name": "australia"
          },
          {
            "name": "pakistan"
          },
          {
            "name": "japan"
          },
          {
            "name": "southKorea"
          }
        ]
      }
    },
    {
      "name": "ranchProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "country",
            "type": {
              "defined": {
                "name": "country"
              }
            }
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "animalCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "verifierProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
