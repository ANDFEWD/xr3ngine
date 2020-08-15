import React, {useEffect, useState} from 'react'
import { bindActionCreators, Dispatch } from 'redux'
import { connect } from 'react-redux'
import './style.scss'
import _ from '../../../../../packages/server/hooks/node_modules/lodash'
import {
    Avatar,
    Button,
    ButtonGroup,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    MenuItem,
    Select,
    TextField,
    Tab,
    Tabs,
    SwipeableDrawer,
    Divider
} from '@material-ui/core'
import {
    Add,
    AccountCircle,
    ArrowDownward,
    ArrowUpward,
    ChevronLeft,
    ChevronRight,
    Group,
    GroupWork,
    Mail,
    PhoneIphone,
    SupervisedUserCircle
} from '@material-ui/icons'
import { selectAuthState } from '../../../../redux/auth/selector'
import { getFriends } from '../../../../redux/friend/service'
import { selectFriendState } from '../../../../redux/friend/selector'
import { selectInviteState } from '../../../../redux/invite/selector'
import { selectGroupState } from '../../../../redux/group/selector'
import { selectPartyState } from '../../../../redux/party/selector'
import {
    sendInvite,
    retrieveReceivedInvites,
    retrieveSentInvites,
    deleteInvite,
    acceptInvite,
    declineInvite,
    updateInviteTarget
} from '../../../../redux/invite/service'
import {
    getInvitableGroups
} from '../../../../redux/group/service'
import {User} from '../../../../../common/interfaces/User'


const mapStateToProps = (state: any): any => {
    return {
        authState: selectAuthState(state),
        friendState: selectFriendState(state),
        inviteState: selectInviteState(state),
        groupState: selectGroupState(state),
        partyState: selectPartyState(state)
    }
}

const mapDispatchToProps = (dispatch: Dispatch): any => ({
    getFriends: bindActionCreators(getFriends, dispatch),
    retrieveReceivedInvites: bindActionCreators(retrieveReceivedInvites, dispatch),
    retrieveSentInvites: bindActionCreators(retrieveSentInvites, dispatch),
    sendInvite: bindActionCreators(sendInvite, dispatch),
    deleteInvite: bindActionCreators(deleteInvite, dispatch),
    acceptInvite: bindActionCreators(acceptInvite, dispatch),
    declineInvite: bindActionCreators(declineInvite, dispatch),
    updateInviteTarget: bindActionCreators(updateInviteTarget, dispatch),
    getInvitableGroups: bindActionCreators(getInvitableGroups, dispatch)
})

interface Props {
    authState?: any
    friendState?: any
    inviteState?: any
    retrieveReceivedInvites?: typeof retrieveReceivedInvites
    retrieveSentInvites?: typeof retrieveSentInvites
    sendInvite?: typeof sendInvite
    getFriends?: typeof getFriends,
    deleteInvite?: typeof deleteInvite,
    acceptInvite?: typeof acceptInvite,
    declineInvite?: typeof declineInvite,
    rightDrawerOpen?: any
    setRightDrawerOpen?: any
    groupState?: any
    updateInviteTarget?: any
    partyState?: any
    getInvitableGroups?: any
}

const identityProviderTabMap = new Map()
identityProviderTabMap.set(0, 'email')
identityProviderTabMap.set(1, 'sms')

const Invites = (props: Props): any => {
    const {
        authState,
        friendState,
        inviteState,
        sendInvite,
        retrieveReceivedInvites,
        retrieveSentInvites,
        getFriends,
        deleteInvite,
        acceptInvite,
        declineInvite,
        groupState,
        updateInviteTarget,
        partyState,
        getInvitableGroups
    } = props
    const user = authState.get('user') as User
    const friendSubState = friendState.get('friends')
    const friends = friendSubState.get('friends')
    const receivedInviteState = inviteState.get('receivedInvites')
    const receivedInvites = receivedInviteState.get('invites')
    const sentInviteState = inviteState.get('sentInvites')
    const sentInvites = sentInviteState.get('invites')
    const targetObjectType = inviteState.get('targetObjectType')
    const targetObjectId = inviteState.get('targetObjectId')
    const invitableGroupState = groupState.get('invitableGroups')
    const invitableGroups = invitableGroupState.get('groups')
    const party = partyState.get('party')
    const selfPartyUser = party && party.partyUsers ? party.partyUsers.find((partyUser) => partyUser.userId === user.id): {}
    const [tabIndex, setTabIndex] = useState(0)
    const [inviteTabIndex, setInviteTabIndex] = useState(0)
    const [ inviteTypeIndex, setInviteTypeIndex ] = useState(0)
    const [userToken, setUserToken] = useState('')
    const [ deletePending, setDeletePending ] = useState('')

    useEffect(() => {
        if (groupState.get('invitableUpdateNeeded') === true && groupState.get('getInvitableGroupsInProgress') !== true) {
            getInvitableGroups(0)
        }
    }, [groupState]);

    const handleChange = (event: any, newValue: number): void => {
        event.preventDefault()
        setTabIndex(newValue)
        setUserToken('')
    }

    const handleInviteTypeChange = (e: any, newValue: number): void => {
        e.preventDefault()
        setInviteTypeIndex(newValue)
        if (newValue === 0 && tabIndex === 3) {
            setTabIndex(0)
        }
    }

    const updateInviteTargetType = (targetObjectType: string, targetObjectId: string) => {
        updateInviteTarget(targetObjectType, targetObjectId)
        setUserToken((''))
    }

    const handleInviteGroupChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
        updateInviteTarget('group', event.target.value)
    }

    const handleInviteChange = (event: any, newValue: number): void => {
        event.preventDefault()
        setInviteTabIndex(newValue)
    }

    const handleUserTokenChange = (event: any): void => {
        setUserToken(event.target.value)
    }

    const packageInvite = (event: any): void => {
        const mappedIDProvider = identityProviderTabMap.get(tabIndex)
        const sendData = {
            type: inviteState.get('targetObjectType') === 'user' ? 'friend' : inviteState.get('targetObjectType'),
            token: mappedIDProvider ? userToken : null,
            identityProviderType: mappedIDProvider ? mappedIDProvider : null,
            targetObjectId: inviteState.get('targetObjectId'),
            inviteeId: (tabIndex === 2 || tabIndex === 3) ? userToken : null
        }

        sendInvite(sendData)
        setUserToken('')
    }

    const showDeleteConfirm = (inviteId) => {
        setDeletePending(inviteId)
    }

    const cancelDelete = () => {
        setDeletePending('')
    }

    const confirmDelete = (inviteId) => {
        setDeletePending('')
        deleteInvite(inviteId)
    }

    const nextInvitePage = () => {
        if (inviteTabIndex === 0) {
            if ((receivedInviteState.get('skip') + receivedInviteState.get('limit')) < receivedInviteState.get('total')) {
                retrieveReceivedInvites(receivedInviteState.get('skip') + receivedInviteState.get('limit'))
            }
        }
        else {
            if ((sentInviteState.get('skip') + sentInviteState.get('limit')) < sentInviteState.get('total')) {
                retrieveSentInvites(sentInviteState.get('skip') + sentInviteState.get('limit'))
            }
        }
    }

    const acceptRequest = (invite) => {
        acceptInvite(invite.id, invite.passcode)
    }

    const declineRequest = (invite) => {
        declineInvite(invite.id)
    }

    useEffect(() => {
        if (inviteState.get('sentUpdateNeeded') === true && inviteState.get('getSentInvitesInProgress') !== true) {
            retrieveSentInvites()
        }
        if (inviteState.get('receivedUpdateNeeded') === true && inviteState.get('getReceivedInvitesInProgress') !== true) {
            retrieveReceivedInvites()
        }
        const value = targetObjectType === 'party' ? 2 : targetObjectType === 'group' ? 1 : 0
        setInviteTypeIndex(value)
        if (value === 0 && tabIndex === 3) {
            setTabIndex(0)
        }
        if (targetObjectType == null || targetObjectType.length === 0) {
            updateInviteTarget('user', null)
        }
    }, [inviteState])

    const capitalize = (word) => word[0].toUpperCase() + word.slice(1)

    const onListScroll = (e): void => {
        if ((e.target.scrollHeight - e.target.scrollTop) === e.target.clientHeight ) {
            nextInvitePage()
        }
    }

    const onSelectScroll = (e): void => {
        if ((e.target.scrollHeight - e.target.scrollTop) === e.target.clientHeight ) {
            nextInvitableGroupsPage()
        }
    }

    const onFriendScroll = (e): void => {
        if ((e.target.scrollHeight - e.target.scrollTop) === e.target.clientHeight ) {
            nextFriendsPage()
        }
    }

    const nextInvitableGroupsPage = () => {
        if ((invitableGroupState.get('skip') + invitableGroupState.get('limit')) < invitableGroupState.get('total')) {
            getInvitableGroups(invitableGroupState.get('skip') + invitableGroupState.get('limit'))
        }
    }

    const nextFriendsPage = (): void => {
        if ((friendSubState.get('skip') + friendSubState.get('limit')) < friendSubState.get('total')) {
            getFriends(friendSubState.get('skip') + friendSubState.get('limit'))
        }
    }

    return (
        <div className="invite-container">
            <SwipeableDrawer
                className="flex-column list-container"
                BackdropProps={{ invisible: true }}
                anchor="right"
                open={props.rightDrawerOpen === true}
                onClose={() => {props.setRightDrawerOpen(false)}}
                onOpen={() => {}}
            >
                <div className="title">Invites</div>
                <Tabs
                    value={inviteTabIndex}
                    onChange={handleInviteChange}
                    variant="fullWidth"
                    indicatorColor="secondary"
                    textColor="secondary"
                    aria-label="Invites"
                >
                    <Tab
                        icon={<Add/>}
                        label="Create"
                    />
                    <Tab
                        icon={<ArrowDownward />}
                        label="Received"
                    />
                    <Tab
                        icon={<ArrowUpward />}
                        label="Sent"
                    />
                </Tabs>
                {
                    (inviteTabIndex === 2 || inviteTabIndex === 1) &&
					<List
						onScroll={(e) => onListScroll(e)}
					>
                        { inviteTabIndex === 1 && receivedInvites.sort((a, b) => {return a.created - b.created }).map((invite, index) => {
                            return <div key={invite.id}>
                                <ListItem>
                                    <ListItemAvatar>
                                        <Avatar src={invite.user.avatarUrl}/>
                                    </ListItemAvatar>
                                    {invite.inviteType === 'friend' && <ListItemText>{capitalize(invite.inviteType)} request
										from {invite.user.name}</ListItemText>}
                                    {invite.inviteType === 'group' &&
									<ListItemText>Join group {invite.groupName} from {invite.user.name}</ListItemText>}
                                    {invite.inviteType === 'party' &&
									<ListItemText>Join a party from {invite.user.name}</ListItemText>}
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => acceptRequest(invite)}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => declineRequest(invite)}
                                    >
                                        Decline
                                    </Button>
                                </ListItem>
                                {index < receivedInvites.length - 1 && <Divider/>}
                            </div>
                        })
                        }
                        { inviteTabIndex === 2 && sentInvites.sort((a, b) => { return a.created - b.created }).map((invite, index) => {
                            return <div key={invite.id}>
                                <ListItem>
                                    <ListItemAvatar>
                                        <Avatar src={invite.invitee?.avatarUrl}/>
                                    </ListItemAvatar>
                                    {invite.inviteType === 'friend' && <ListItemText>{capitalize(invite.inviteType)} request
										to {invite.invitee ? invite.invitee.name : invite.token}</ListItemText>}
                                    {invite.inviteType === 'group' && <ListItemText>Join
										group {invite.groupName} to {invite.invitee ? invite.invitee.name : invite.token}</ListItemText>}
                                    {invite.inviteType === 'party' && <ListItemText>Join a party
										to {invite.invitee ? invite.invitee.name : invite.token}</ListItemText>}
                                    {deletePending !== invite.id &&
									<Button onClick={() => showDeleteConfirm(invite.id)}>Uninvite</Button>}
                                    {deletePending === invite.id &&
									<div className="delete-confirm">
										<Button variant="contained"
										        color="primary"
										        onClick={() => confirmDelete(invite.id)}
										>
											Uninvite
										</Button>
										<Button variant="contained"
										        color="secondary"
										        onClick={() => cancelDelete()}
										>
											Cancel
										</Button>
									</div>
                                    }
                                </ListItem>
                                {index < sentInvites.length - 1 && <Divider/>}
                            </div>
                        })
                        }
					</List>
                }
                { inviteTabIndex === 0 &&
                    <div>
                        <div className="title">Send Request</div>
                        <div className="sub-header">Request Type</div>
                        <Tabs
                            value={inviteTypeIndex}
                            onChange={handleInviteTypeChange}
                            variant="fullWidth"
                            indicatorColor="primary"
                            textColor="primary"
                            aria-label="Invite Type"
                        >

                            <Tab
                                icon={<SupervisedUserCircle style={{fontSize: 30}}/>}
                                label="Friends"
                                onClick={() => updateInviteTargetType('user', null)}
                            />
                            <Tab
                                icon={<Group style={{fontSize: 30}}/>}
                                label="Groups"
                                onClick={() => updateInviteTargetType('group', null)}
                            />
                            <Tab
                                icon={<GroupWork style={{fontSize: 30}}/>}
                                label="Party"
                                onClick={() => {
                                    if (party?.id) {
                                        updateInviteTargetType('party', party.id)
                                    }
                                }}
                            />
                        </Tabs>
                        {inviteTypeIndex === 1 &&
                            <div className="flex-justify-center">
                                {invitableGroupState.get('total') > 0 &&
                                <FormControl className="group-select">
                                    <InputLabel id="invite-group-select-label">Group</InputLabel>
                                    <Select
                                        labelId="invite-group-select-label"
                                        id="invite-group-select"
                                        value={inviteState.get('targetObjectId')}
                                        onChange={handleInviteGroupChange}
                                        onScroll={onSelectScroll}
                                    >
                                        { invitableGroups.map((group) => {
                                            return <MenuItem
                                                className="flex-center"
                                                key={group.id}
                                                value={group.id}
                                            >
                                                    {group.name}
                                            </MenuItem>
                                            })
                                        }
                                        </Select>
                                        </FormControl>
                                    }
                                    { invitableGroupState.get('total') === 0 && <div>You cannot invite people to any groups</div>}
                                </div>
                        }
                        { inviteTypeIndex === 2 && party == null &&
                            <div className="flex-justify-center">You are not currently in a party</div>
                        }
                        { inviteTypeIndex === 2 && party != null && selfPartyUser?.isOwner !== true &&
                            <div className="flex-justify-center">You are not the owner of your current party</div>
                        }
                        {!((inviteTypeIndex === 1 && invitableGroupState.get('total') === 0) ||
                            (inviteTypeIndex === 1 && _.find(invitableGroupState.get('groups'), (invitableGroup) => invitableGroup.id === inviteState.get('targetObjectId')) == null) ||
                            (inviteTypeIndex === 2 && party == null) ||
                            (inviteTypeIndex === 2 && party != null && selfPartyUser?.isOwner !== true)) &&
                                <div>
                                    <Tabs
                                        value={tabIndex}
                                        onChange={handleChange}
                                        variant="fullWidth"
                                        indicatorColor="secondary"
                                        textColor="secondary"
                                        aria-label="Invite Address"
                                    >
                                        <Tab
                                            icon={<Mail/>}
                                            label="Email"
                                        />
                                        <Tab
                                            icon={<PhoneIphone/>}
                                            label="Phone #"
                                        />
                                        <Tab
                                            icon={<AccountCircle/>}
                                            label="User ID"
                                        />
                                        {inviteTypeIndex !== 0 &&
                                            <Tab
                                                icon={<SupervisedUserCircle/>}
                                                label="Friend"
                                            />
                                        }
                                    </Tabs>

                                    <div className="username">
                                        {tabIndex !== 3 && <TextField
		                                    variant="outlined"
		                                    margin="normal"
		                                    fullWidth
		                                    id="token"
		                                    label={tabIndex === 0 ? "Recipient's email" : tabIndex === 1 ? "Recipient's phone number" : "Recipient's user ID"}
		                                    name="name"
		                                    autoFocus
		                                    value={userToken}
		                                    onChange={(e) => handleUserTokenChange(e)}
	                                    />
                                        }
                                        {tabIndex === 3 &&
                                            <FormControl className="friend-select">
                                                <InputLabel id="invite-friend-select-label">Friend</InputLabel>
                                                <Select
                                                    labelId="invite-friend-select-label"
                                                    id="invite-friend-select"
                                                    value={userToken}
                                                    onChange={(e) => handleUserTokenChange(e)}
                                                    onScroll={onFriendScroll}
                                                >
                                                    { friends.map((friend) => {
                                                        return <MenuItem
                                                            className="flex-center"
                                                            key={friend.id}
                                                            value={friend.id}
                                                        >
                                                            {friend.name}
                                                        </MenuItem>
                                                    })
                                                    }
                                                </Select>
                                            </FormControl>
                                        }
                                        <Button variant="contained"
                                                color="primary"
                                                onClick={packageInvite}
                                        >
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            }
						</div>
                    }
					</SwipeableDrawer>
                    </div>
                        )
                    }

					export default connect(mapStateToProps, mapDispatchToProps)(Invites)