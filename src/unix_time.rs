
use std::fmt::{
    self,
    Display,
    Formatter,
};
use std::time::SystemTime;

use chrono_tz::Tz;
use chrono::prelude::*;


/// Elapsed non-leap seconds since UNIX epoch.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Ord, Eq, Hash)]
pub struct UnixTime {
    secs: u64,
}

impl UnixTime {
    pub fn new(secs: u64) -> Self {
        Self {
            secs,
        }
    }

    pub fn now() -> Self {
        match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
            Ok(n) => n.as_secs(),
            Err(_) => panic!("SystemTime before UNIX EPOCH!"),
        }.into()
    }

    fn naive_datetime(&self) -> NaiveDateTime {
        NaiveDateTime::from_timestamp_opt(self.secs as i64, 0).unwrap()
    }

    pub fn to_utc_datetime_string(&self) -> String {
        let utc_datetime = self.naive_datetime();
        let utc_datetime = DateTime::<Utc>::from_naive_utc_and_offset(utc_datetime, Utc);
        utc_datetime.format("%Y-%m-%dT%H:%M:%S%z").to_string()
    }

    pub fn to_datetime(&self, timezone: Tz) -> DateTime<Tz> {
        let utc_datetime = self.naive_datetime();
        timezone.from_utc_datetime(&utc_datetime)
    }
}

impl Display for UnixTime {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.secs)
    }
}

impl From<u64> for UnixTime {
    fn from(secs: u64) -> Self {
        Self::new(secs)
    }
}

impl From<UnixTime> for u64 {
    fn from(unix_time: UnixTime) -> Self {
        unix_time.secs
    }
}
