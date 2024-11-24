import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: null,
  error: null,
  loading: true
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.currentUser = action.payload;
      state.error = null;
      state.loading = false;
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.error = null;
      state.loading = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setUser, clearUser, setError } = userSlice.actions;
export default userSlice.reducer; 