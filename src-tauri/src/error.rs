//! One error type for the whole backend. It serializes to a plain string so the
//! frontend receives a readable message from every failed `invoke` call.

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("terminal session {0} not found")]
    SessionNotFound(u32),
    #[error("invalid argument: {0}")]
    InvalidArgument(String),
    #[error("failed to start shell: {0}")]
    Spawn(String),
    #[error("terminal I/O error: {0}")]
    Io(String),
    #[error("internal state is unavailable (lock poisoned)")]
    Poisoned,
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
