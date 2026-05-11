use serde_json::Value;

use super::HandlerError;
use crate::context::HandlerContext;

pub async fn run_build(ctx: &HandlerContext, params: Value) -> Result<Value, HandlerError> {
    let _ = (ctx, params);
    Err(HandlerError::Other("not yet implemented".into()))
}
