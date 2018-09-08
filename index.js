const { ApolloServer, PubSub } = require('apollo-server')
const lifts = require('./data/lifts.json')
const trails = require('./data/trails.json')

const pubSub  = new PubSub()

const context = { lifts, trails, pubSub }

// 1. Add an allTrails Query
// 2. Add a Trail(id: ID!)  Query
// 3. Add a setTrailStatus Mutation

const typeDefs = `
  type Lift {
    id: ID!
    name: String!
    status: LiftStatus!
    capacity: Int!
    night: Boolean
    elevation: Int!
    liftAccess: [Lift!]!
    trailAccess: [Trail]
  }

  enum LiftStatus {
    OPEN
    HOLD
    CLOSED
  }

  type Trail {
    id: ID!
    name: String!
    status: LiftStatus!
    capacity: Int!
    night: Boolean
    elevation: Int!
    liftAccess: [Lift]
  }

  enum TrailStatus {
    OPEN
    HOLD
    CLOSED
  }

  type Query {
    allLifts(status: LiftStatus): [Lift!]!
    Lift(id: ID!): Lift
    allTrails: [Trail!]!
    Trail(id: ID!): Trail
  }

  type Mutation {
    setLiftStatus(id: ID!, status: LiftStatus!): Lift!
    setTrailStatus(id: ID!, status: TrailStatus!): Trail!
  },

  type Subscription {
    liftStatusChange: Lift
    trailStatusChange: Trail
  }
`

const resolvers = {
  Query: {
    allLifts: (root, { status }, { lifts }) =>  {
      if (!status) {
        return lifts
      } else {
        var filteredLifts = lifts.filter(
          lift => status === lift.status
        )
        return filteredLifts
      }
    },
    Lift: (root, args, { lifts }) => {
      var selectedLift = lifts.filter(
        lift => args.id === lift.id
      )
      return selectedLift[0]
    },
    allTrails: (root, { status }, { trails }) =>  {
      if (!status) {
        return trails
      } else {
        var filteredTrails = trails.filter(
          trail => status === trail.status
        )
        return filteredTrails
      }
    },
    Trail: (root, { id }, { trails }) => {
      var selectedTrail = trails.filter(
        trail => id === trail.id
      )
      return selectedTrail[0]
    }
  },

  Mutation: {
    setLiftStatus: (root, { id, status }, { lifts } ) => {
      var updateLift = lifts.find(lift => id === lift.id)
      updateLift.status = status
      pubSub.publish('lift-status-change', { liftStatusChange: updateLift })
      return updateLift
    },
    setTrailStatus: (root, { id, status }, { trails } ) => {
      var updateTrail = trails.find(trail => id === trail.id)
      updateTrail.status = status
      pubSub.publish('trail-status-change', { trailStatusChange: updateTrail })
      return updateTrail
    }
  },

  Subscription: {
    // listen for event
    liftStatusChange: {
      subscribe: (root, args, { pubSub }) =>
        pubSub.asyncIterator('lift-status-change')
    },
    trailStatusChange: {
      subscribe: (root, args, { pubSub }) =>
        pubSub.asyncIterator('trail-status-change')
    }
  },

  // TRIVIAL RESOLVER
  Lift: {
    // look at the parent to find the Lift
    trailAccess: (root, args, { trails }) => root.trails.map(
      id => trails.find(t => id === t.id)
    )
  },

  // TRIVIAL RESOLVER
  Trail: {
    // look at the parent to find the Trail
    liftAccess: (root, args, { lifts }) => root.lift.map(
      id => lifts.find(l => id === l.id)
    )
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context
  //mocks: true  // fill in the blanks for anything in schema not resolved
})

server.listen().then(({url}) => console.log(`Server running at ${url}`))