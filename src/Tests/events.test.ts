process.env.NODE_ENV = "test";

import chai from "chai";
import chaiHttp from "chai-http";
import server from "../app";
import prisma from "../lib/prisma";

chai.use(chaiHttp);
const should = chai.should();

describe("events", () => {
  beforeEach("clear database", (done) => {
    prisma.event.deleteMany({}).then((a) => done());
  });

  describe("Getall events", () => {
    it("should return an empty array", (done) => {
      chai
        .request(server)
        .get("/api/events/")
        .end((err, res) => {
          should.not.exist(err);
          res.should.have.status(204);
          done();
        });
    });
    it("should return an array with all the objects", (done) => {
      prisma.event
        .create({
          data: { date: new Date(Date.now()).toISOString(), name: "yes" },
        })
        .then((a) => {
          chai
            .request(server)
            .get("/api/events")
            .end((err, res) => {
              should.not.exist(err);
              res.should.have.status(200);
              res.body.should.be.a("array");
              res.body.length.should.be.eql(1);
              done();
            });
        });
    });
  });
  describe("#add", () => {
    it("should return object", (done) => {
      let event = {
        date: new Date(Date.now()).toISOString(),
        name: "test",
      };

      chai
        .request(server)
        .post("/api/events")
        .send(event)
        .end((err, res) => {
          should.not.exist(err);
          res.should.have.status(201);
          res.should.be.a("object");
          res.body.should.have.property("pid");
          res.body.should.have.property("name");
          res.body.should.have.property("date");
          done();
        });
    });

    it("should return 400 if the request is malformed", (done) => {
      chai
        .request(server)
        .post("/api/events")
        .send()
        .end((err, res) => {
          should.not.exist(err);
          res.should.have.status(400);
          res.body.should.not.have.property("");
          done();
        });
    });
  });
});
