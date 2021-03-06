import { ServiceAddons } from '@feathersjs/feathers'
import { Application } from '../../declarations'
import { User } from './user.class'
import createModel from '../../models/user.model'
import hooks from './user.hooks'
import _ from 'lodash'

declare module '../../declarations' {
  interface ServiceTypes {
    'user': User & ServiceAddons<any>;
  }
}

export default (app: Application): void => {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    multi: true
  }

  app.use('/user', new User(options, app))

  const service = app.service('user')

  service.hooks(hooks)

  service.publish('patched', async (data, params): Promise<any> => {
    try {
      const groupUsers = await app.service('group-user').Model.findAll({
        where: {
          userId: data.id
        }
      })
      const partyUsers = await app.service('party-user').Model.findAll({
        where: {
          userId: data.id
        }
      })
      const userRelationships = await app.service('user-relationship').Model.findAll({
        where: {
          userRelationshipType: 'friend',
          relatedUserId: data.id
        }
      })

      let targetIds = [data.id];
      const updatePromises = [];

      groupUsers.forEach((groupUser) => {
        updatePromises.push(app.service('group-user').patch(groupUser.id, {
          groupUserRank: groupUser.groupUserRank
        }))
        targetIds.push(groupUser.userId)
      })
      partyUsers.forEach((partyUser) => {
        updatePromises.push(app.service('party-user').patch(partyUser.id, {
          isOwner: partyUser.isOwner
        }))
        targetIds.push(partyUser.userId)
      })
      userRelationships.forEach((userRelationship) => {
        updatePromises.push(app.service('user-relationship').patch(userRelationship.id, {
          userRelationshipType: userRelationship.userRelationshipType,
          userId: userRelationship.userId
        }, params))
        targetIds.push(userRelationship.userId)
        targetIds.push(userRelationship.relatedUserId)
      })

      await Promise.all(updatePromises)
      targetIds = _.uniq(targetIds)
      return Promise.all(targetIds.map((userId: string) => {
        return app.channel(`userIds/${userId}`).send({
          userRelationship: data
        })
      }))
    } catch (err) {
      console.log(err)
      throw err
    }
  })
}
