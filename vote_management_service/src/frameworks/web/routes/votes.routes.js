var express = require('express')
var router = express.Router()

const { verifyTokenMiddleware,
    verifyUserMiddleware,
    verifyAdminMiddleware,} = 
require("../../../adapter/middlewares/auth.middleware")

const VotesController = require("../../../adapter/controllers/votes.controller")
const VotesUseCase = require("../../../use-cases/votes.case")
const VotesRepository = require("../../db/data-services/votes.repo")
const VotesPublisher = require("../../rabbitmq/pubs/votes.pub.js")
const ResultsPublisher = require("../../rabbitmq/pubs/results.pub")
const VoteToCandidateRepo = require("../../db/data-services/votes_to_candidates.repo") 

const voteToCandidateRepo = new VoteToCandidateRepo()
const votesRepo = new VotesRepository()
const votesPublisher = new VotesPublisher()
const resultsPublisher = new ResultsPublisher()
const votesUseCase = new VotesUseCase(votesRepo, votesPublisher, resultsPublisher,voteToCandidateRepo)
const votesController = new VotesController(votesUseCase)

// Submit vote, user
router.post("/submit/", 
verifyTokenMiddleware,
verifyUserMiddleware,
votesController.submitVote
)


// Get all votes for election, admin 
router.get("/election/:election_id",
verifyTokenMiddleware,
verifyUserMiddleware,
verifyAdminMiddleware,
votesController.getAllVoteToCandidate
)

// Get one vote submission , admin
router.get("/submissions/:vote_id",
verifyTokenMiddleware,
verifyUserMiddleware,
verifyAdminMiddleware,
votesController.getOneVote
)

// Get all vote submissions for election, admin 
router.get("/submissions/election/:election_id",
verifyTokenMiddleware,
verifyUserMiddleware,
verifyAdminMiddleware,
votesController.getAllVotes
)

router.get('/check-user-vote/:election_id',
verifyTokenMiddleware,
verifyUserMiddleware,
votesController.userVotedForElection)



module.exports = router