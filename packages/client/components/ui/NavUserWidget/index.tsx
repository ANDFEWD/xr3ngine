import React, { useEffect } from 'react';
import Button from '@material-ui/core/Button';
import SignIn from '../Auth/Login';
import { logoutUser } from '../../../redux/auth/service';
import { selectAuthState } from '../../../redux/auth/selector';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { showDialog } from '../../../redux/dialog/service';
import Dropdown from '../Profile/ProfileDropdown';
import { User } from '@xr3ngine/common/interfaces/User';
import './style.scss';

const mapStateToProps = (state: any): any => {
  return { auth: selectAuthState(state) };
};

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  logoutUser: bindActionCreators(logoutUser, dispatch),
  showDialog: bindActionCreators(showDialog, dispatch),
});

interface Props {
  auth?: any;
  logoutUser?: typeof logoutUser;
  showDialog?: typeof showDialog;
}

const styles = {
  loginButton: {
    color: 'white',
  },
  logoutButton: {
    color: 'white',
  },
};

const NavUserBadge = (props: Props): any => {
  useEffect(() => {
    handleLogin();
  }, []);

  const handleLogout = () => {
    props.logoutUser();
  };

  const handleLogin = () => {
    const params = new URLSearchParams(document.location.search);
    const showLoginDialog = params.get('login');
    if (showLoginDialog === String(true)) {
      props.showDialog({ children: <SignIn /> });
    }
  };

  const isLoggedIn = props.auth.get('isLoggedIn');
  const user = props.auth.get('user') as User;
  // const userName = user && user.name

  return (
    <div className="userWidget">
      {isLoggedIn && (
        <div className="flex">
          <Dropdown
            avatarUrl={user && user.avatarUrl}
            auth={props.auth}
            logoutUser={props.logoutUser}
          />
        </div>
      )}
      {!isLoggedIn && (
        <Button
          style={styles.loginButton}
          onClick={() =>
            props.showDialog({
              children: <SignIn />,
            })
          }
        >
          Log In
        </Button>
      )}
    </div>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(NavUserBadge);
