import argon2 from "argon2";

async function test() {
  try {
    const hash = await argon2.hash("123456");
    console.log("Hash:", hash);
    const valid = await argon2.verify(hash, "123456");
    console.log("Valid:", valid);
  } catch (err) {
    console.error("Argon2 error:", err);
  }
}

test();
