import '../styles/base.css';
import '../styles/game.css';
import { mount } from './mount';
import { GamePage } from '../pages/GamePage';

// Old CV links used ?view=cv on the home page
if (/[?&]view=cv(&|$)/.test(location.search)) location.replace(`${import.meta.env.BASE_URL}cv/`);
else mount(<GamePage />);
