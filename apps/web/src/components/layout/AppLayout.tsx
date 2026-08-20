import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import StorageIcon from '@mui/icons-material/Storage';
import ArticleIcon from '@mui/icons-material/Article';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useAuthStore } from '../../stores/auth';

const DRAWER_WIDTH = 260;

const NAV = [
  { label: 'Dashboard', path: '/', icon: DashboardIcon },
  { label: 'Conversations', path: '/conversations', icon: ChatIcon },
  { label: 'Customers', path: '/customers', icon: PeopleIcon },
  { label: 'Menus', path: '/menus', icon: MenuBookIcon },
  { label: 'Workflows', path: '/workflows', icon: AccountTreeIcon },
  { label: 'Business Data', path: '/business-data', icon: StorageIcon },
  { label: 'Templates', path: '/templates', icon: ArticleIcon },
  { label: 'Agents', path: '/agents', icon: SupportAgentIcon },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  const handleLogout = () => {
    clear();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ gap: 1, color: 'primary.main' }}>
        <WhatsAppIcon />
        <Typography variant="h6" fontWeight={700} noWrap>
          WA Platform
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {NAV.map(({ label, path, icon: Icon }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <ListItemButton key={path} selected={active} onClick={() => navigate(path)}>
              <ListItemIcon>
                <Icon color={active ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}
        color="inherit"
        elevation={0}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {location.pathname === '/' ? '' : location.pathname}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}>{user?.name?.[0] ?? '?'}</Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={600}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}