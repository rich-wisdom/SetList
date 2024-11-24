import { configureStore } from '@reduxjs/toolkit';
import { store, persistor } from './store/store';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
}); 