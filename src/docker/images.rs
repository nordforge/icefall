use bollard::image::CreateImageOptions;
use futures_util::StreamExt;

use crate::docker::{DockerClient, DockerError};

impl DockerClient {
    pub async fn pull_image(&self, name: &str, tag: &str) -> Result<(), DockerError> {
        let options = CreateImageOptions {
            from_image: name,
            tag,
            ..Default::default()
        };

        let mut stream = self.inner().create_image(Some(options), None, None);

        while let Some(result) = stream.next().await {
            result?;
        }

        Ok(())
    }

    pub async fn remove_image(&self, name: &str) -> Result<(), DockerError> {
        self.inner()
            .remove_image(name, None, None)
            .await?;
        Ok(())
    }
}
