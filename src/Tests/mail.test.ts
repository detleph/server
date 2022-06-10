/*process.env.NODE_ENV = "test";

import chai, { expect } from "chai";
import chaiaspromised from "chai-as-promised";
import mail from "../lib/mail";

chai.use(chaiaspromised);
const should = chai.should();

describe("mail", () => {
  it("should succesfully send a email", async () => {
    //NOTE THESE TESTS ONLY WORK WITH DEV BEING TRUE
    const info = await mail.sendMail('"Chai Testing suite" <test@test.test>', "test@example.com", "Hello", "Test");
    info.rejected.length.should.eq(0);
    info.accepted.length.should.eq(1);
  });
});
*/
